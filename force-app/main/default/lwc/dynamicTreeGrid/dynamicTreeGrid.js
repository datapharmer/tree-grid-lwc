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
        const hasChildrenContent = event.detail.hasChildrenContent;
        const isExpanded = event.detail.isExpanded;

        if (!hasChildrenContent && isExpanded) {
            this.isLoading = true;
            getChildCampaigns({ parentId: rowName })
                .then((result) => {
                    if (result && result.length > 0) {
                        this.processChildCampaignData(result, rowName);
                    } else {
                        // No children. Update *before* dispatching the toast.
                        this.gridData = this.removeExpandArrow(rowName, this.gridData);
                        // *Now* dispatch the toast (it's guaranteed to be accurate).
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
            _children: undefined,  // Initially undefined
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
        _children: undefined, // Initially undefined
        Name: campaign.Name,
        ParentCampaignName: campaign.Parent?.Name,
        campaignUrl: `/${campaign.Id}`,
        parentCampaignUrl: campaign.Parent?.Id ? `/${campaign.Parent.Id}` : undefined,
        Id: campaign.Id,
    }));

    // Update the parent row to have empty children *first*.  This is key.
    this.gridData = this.updateRowChildren(parentRowName, this.gridData, []);

    // *Then*, set the children (after a slight delay). This ensures the tree grid
    // processes the "no children" state correctly *before* adding the children.
    setTimeout(() => {
      this.gridData = this.updateRowChildren(parentRowName, this.gridData, newChildren);
      this.checkChildrenOfChildren(newChildren); // Then check for grandchildren
    }, 0);
  }

    async checkInitialChildren() {
        const updatedData = [];
        for (const row of this.gridData) {
            updatedData.push(await this.checkRowForChildren(row));
        }
        this.gridData = updatedData;
    }

    async checkRowForChildren(row) {
        try {
            const children = await getChildCampaigns({ parentId: row.Id });
            return {
                ...row,
                _children: children && children.length > 0 ? [] : undefined,
            };
        } catch (error) {
            console.error("Error checking for children:", error);
            return row; // Return original row on error
        }
    }
    async checkChildrenOfChildren(newChildren) {
        const updatedChildren = [];
        for (const child of newChildren) {
            updatedChildren.push(await this.checkRowForChildren(child));
        }

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

    updateRowChildren(rowName, data, children) {
        return data.map((row) => {
            if (row.Id === rowName) {
                return { ...row, _children: children };
            } else if (row._children && Array.isArray(row._children)) {
                return { ...row, _children: this.updateRowChildren(rowName, row._children, children) };
            }
            return row;
        });
    }

    removeExpandArrow(rowName, data) {
        return this.updateRowChildren(rowName, data, undefined);
    }
}
