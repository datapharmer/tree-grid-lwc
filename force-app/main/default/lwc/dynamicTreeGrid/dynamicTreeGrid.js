import { LightningElement, wire } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { NavigationMixin } from "lightning/navigation";

// Import the schema
import CAMPAIGN_NAME from "@salesforce/schema/Campaign.Name";
import PARENT_CAMPAIGN_NAME from "@salesforce/schema/Campaign.Parent.Name";
import TYPE from "@salesforce/schema/Campaign.Type";

// Import Apex
import getAllParentCampaigns from "@salesforce/apex/DynamicTreeGridController.getAllParentCampaigns";
import getChildCampaigns from "@salesforce/apex/DynamicTreeGridController.getChildCampaigns";

const COLS = [
    {
        label: "Campaign Name",
        fieldName: "campaignUrl",
        type: "url",
        typeAttributes: {
            label: { fieldName: "Name" },
            target: "_blank"
        },
        cellAttributes: { class: { fieldName: 'slds-truncate' } }
    },
    {
        label: "Parent Campaign",
        fieldName: "parentCampaignUrl",
        type: "url",
        typeAttributes: {
            label: { fieldName: "ParentCampaignName" },
            target: "_blank"
        },
        cellAttributes: { class: { fieldName: 'slds-truncate' } }
    },
    { fieldName: "Type", label: "Campaign Type" }
];

export default class DynamicTreeGrid extends NavigationMixin(LightningElement) {
    gridColumns = COLS;
    isLoading = true;
    gridData = [];

    @wire(getAllParentCampaigns, {})
    parentCampaigns({ error, data }) {
        if (error) {
            console.error("error loading campaigns", error);
        } else if (data) {
            this.processCampaignData(data);
            this.isLoading = false;
        }
    }

    handleOnToggle(event) {
        const rowName = event.detail.name;
        if (!event.detail.hasChildrenContent && event.detail.isExpanded) {
            this.isLoading = true;
            getChildCampaigns({ parentId: rowName })
                .then((result) => {
                    if (result && result.length > 0) {
                        this.processChildCampaignData(result, rowName);
                    } else {
                        // No children:  Remove the arrow.
                        this.gridData = this.removeExpandArrow(rowName, this.gridData);
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: "No children",
                                message: "No children for the selected Campaign",
                                variant: "warning"
                            })
                        );
                    }
                })
                .catch((error) => {
                    console.error("Error loading child campaigns", error);
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: "Error Loading Children Campaigns",
                            message: error + " " + error?.message,
                            variant: "error"
                        })
                    );
                })
                .finally(() => {
                    this.isLoading = false;
                });
        }
    }

    // --- Data Processing Functions ---
    processCampaignData(campaigns) {
        this.gridData = campaigns.map((campaign) => ({
            ...campaign,
            _children: undefined, // Initially undefined
            Name: campaign.Name,
            ParentCampaignName: campaign.Parent?.Name,
            campaignUrl: campaign.Id ? `/${campaign.Id}` : undefined,
            parentCampaignUrl: campaign.Parent?.Id ? `/${campaign.Parent.Id}` : undefined,
            Id: campaign.Id,
        }));
        this.checkInitialChildren(); // Check for children on initial load
    }

    processChildCampaignData(campaigns, parentRowName) {
      const newChildren = campaigns.map((campaign) => ({
          ...campaign,
          _children: undefined, // Initially undefined for new children
          Name: campaign.Name,
          ParentCampaignName: campaign.Parent?.Name,
          campaignUrl: `/${campaign.Id}`,
          parentCampaignUrl: campaign.Parent?.Id ? `/${campaign.Parent.Id}` : undefined,
          Id: campaign.Id,
      }));

      this.gridData = this.updateRowChildren(parentRowName, this.gridData, newChildren);
      this.checkChildrenOfChildren(newChildren); // Check for children of the newly added children
    }

    async checkInitialChildren() {
        const updatedData = [];
        for (const row of this.gridData) {
            updatedData.push(await this.checkRowForChildren(row));
        }
        this.gridData = updatedData;
    }

    // Recursively checks for children and updates _children accordingly
    async checkRowForChildren(row) {
        try {
            const children = await getChildCampaigns({ parentId: row.Id });
            const updatedRow = {
                ...row,
                _children: children && children.length > 0 ? [] : undefined, // [] if children, undefined if not
            };
            return updatedRow;
        } catch (error) {
            console.error("Error checking for children:", error);
            return row; // Return original row on error
        }
    }
      // --- NEW FUNCTION ---
    async checkChildrenOfChildren(newChildren) {
        const updatedChildren = [];
        for (const child of newChildren) {
            updatedChildren.push(await this.checkRowForChildren(child));
        }

        // Find and update the children in the main gridData
        this.gridData = this.gridData.map(row => {
            if(row._children && Array.isArray(row._children)) {
              let updatedRowChildren = row._children.map(originalChild => {
                let updatedChild = updatedChildren.find(uc => uc.Id === originalChild.Id);
                return updatedChild ? updatedChild : originalChild;
              });
                return { ...row, _children: updatedRowChildren};
              }
            return row;
        });
    }

    // Recursively update children of a row
    updateRowChildren(rowName, data, children) {
        return data.map(row => {
            if (row.Id === rowName) {
                return { ...row, _children: children };
            } else if (row._children && Array.isArray(row._children)) {
                return { ...row, _children: this.updateRowChildren(rowName, row._children, children) };
            }
            return row;
        });
    }

    // Remove the expand arrow by setting _children to undefined
    removeExpandArrow(rowName, data) {
        return this.updateRowChildren(rowName, data, undefined);
    }
}
