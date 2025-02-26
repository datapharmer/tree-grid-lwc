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
                    if (result) {
                        this.processChildCampaignData(result, rowName);  //Separate processing for Children
                    } else {
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
                _children: [],
                Name: campaign.Name, // Keep the original Name
                ParentCampaignName: campaign.Parent?.Name, // Keep original Parent Name
                campaignUrl: campaign.Id ? `/${campaign.Id}` : undefined, // URL for navigation
                parentCampaignUrl: campaign.Parent?.Id ? `/${campaign.Parent.Id}` : undefined,
                Id: campaign.Id,
            };
        });
    }

    processChildCampaignData(campaigns, parentRowName) {
        const newChildren = campaigns.map((campaign) => ({
            ...campaign,
            _children: [],
            Name: campaign.Name,
            ParentCampaignName: campaign.Parent?.Name,
            campaignUrl: `/${campaign.Id}`,
            parentCampaignUrl: campaign.Parent?.Id ? `/${campaign.Parent.Id}` : undefined,
            Id: campaign.Id
        }));

        this.gridData = this.getNewDataWithChildren(parentRowName, this.gridData, newChildren);
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
}
