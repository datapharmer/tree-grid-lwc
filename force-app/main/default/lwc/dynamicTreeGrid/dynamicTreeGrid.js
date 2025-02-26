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
        fieldName: "campaignUrl",  // Use a dedicated field for the URL
        type: "url",
        typeAttributes: {
            label: { fieldName: "Name" }, // Display the Name
            target: "_blank"
        },
        cellAttributes: { class: { fieldName: 'slds-truncate' } }

    },
    {
        label: "Parent Campaign",
        fieldName: "parentCampaignUrl", // Use a dedicated field for the URL
        type: "url",
        typeAttributes: {
            label: { fieldName: "ParentCampaignName" }, // Display the ParentCampaignName
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
            this.processCampaignData(data); // Call a separate processing function
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
                        this.processChildCampaignData(result, rowName);  //Separate processing for Children
                    } else {
                         // No children: Update the row to remove the expand arrow
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
        this.gridData = campaigns.map((campaign) => {
            return {
                ...campaign,
                _children: [],  // Initially, assume no children
                Name: campaign.Name, // Keep the original Name
                ParentCampaignName: campaign.Parent?.Name, // Keep original Parent Name
                campaignUrl: campaign.Id ? `/${campaign.Id}` : undefined, // URL for navigation
                parentCampaignUrl: campaign.Parent?.Id ? `/${campaign.Parent.Id}` : undefined,
                Id: campaign.Id,
                hasChildren: false, // Add hasChildren property, initially false

            };
        });
        //check if any campaign has children
        this.checkInitialChildren();

    }

    processChildCampaignData(campaigns, parentRowName) {
        const newChildren = campaigns.map((campaign) => ({
            ...campaign,
            _children: [],  // Initially, assume no children
            Name: campaign.Name,
            ParentCampaignName: campaign.Parent?.Name,
            campaignUrl: `/${campaign.Id}`,
            parentCampaignUrl: campaign.Parent?.Id ? `/${campaign.Parent.Id}` : undefined,
            Id: campaign.Id,
            hasChildren: false, // Assume no children initially
        }));

        this.gridData = this.getNewDataWithChildren(parentRowName, this.gridData, newChildren);
        // After adding children, update the parent's hasChildren flag.
        this.gridData = this.updateParentHasChildren(parentRowName, this.gridData, true);
    }
    //New method to check if parent has children
    async checkInitialChildren() {
        for (let i = 0; i < this.gridData.length; i++) {
            const campaign = this.gridData[i];
            try {
                const children = await getChildCampaigns({ parentId: campaign.Id });
                if (children && children.length > 0) {
                   // Update hasChildren flag in the gridData
                   this.gridData = this.updateParentHasChildren(campaign.Id, this.gridData, true);
                }
            } catch (error) {
                console.error("Error checking for children:", error);
                // Handle error appropriately, e.g., show a toast message
            }
        }
    }

    getNewDataWithChildren(rowName, data, children) {
                return data.map((row) => {
                        let hasChildrenContent = false;
                        if (
                                Object.prototype.hasOwnProperty.call(row, "_children") &&
                                Array.isArray(row._children) &&
                                row._children.length > 0
                        ) {
                                hasChildrenContent = true;
                        }

                        if (row.Id === rowName) {
                                row._children = children;
                        } else if (hasChildrenContent) {
                                this.getNewDataWithChildren(rowName, row._children, children);
                        }
                        return row;
                });
        }

     // Function to update the parent's hasChildren flag
     updateParentHasChildren(rowName, data, hasChildren) {
        return data.map((row) => {
            if (row.Id === rowName) {
                return { ...row, _children: hasChildren ? row._children : [], hasChildren: hasChildren }; // Update hasChildren
            } else if (row._children && row._children.length > 0) {
                return { ...row, _children: this.updateParentHasChildren(rowName, row._children, hasChildren) };
            }
            return row;
        });
    }

    // Function to remove the expand arrow if no children are found
    removeExpandArrow(rowName, data) {
       return this.updateParentHasChildren(rowName, data, false);
    }
}
