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
import hasChildCampaigns from "@salesforce/apex/DynamicTreeGridController.hasChildCampaigns";


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
            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Error Loading Campaigns",
                    message: error.body.message,
                    variant: "error"
                })
            );
        } else if (data) {
            this.processInitialCampaignData(data);
        }
    }

    async processInitialCampaignData(campaigns) {
        const processedData = [];

        for (const campaign of campaigns) {
            // Check for children *before* adding to gridData
            const hasChildren = await hasChildCampaigns({ parentId: campaign.Id });

            processedData.push({
                ...campaign,
                _children: hasChildren ? [] : undefined, //  empty array (for lazy loading) or undefined if no children
                Name: campaign.Name,
                ParentCampaignName: campaign.Parent?.Name,
                campaignUrl: campaign.Id ? `/${campaign.Id}` : undefined,
                parentCampaignUrl: campaign.Parent?.Id ? `/${campaign.Parent.Id}` : undefined,
                Id: campaign.Id,
            });
        }
        this.gridData = processedData;
        this.isLoading = false;
    }


handleOnToggle(event) {
    const rowName = event.detail.name;
    if (!event.detail.hasChildrenContent && event.detail.isExpanded) {
        this.isLoading = true;
        getChildCampaigns({ parentId: rowName })
            .then(async (result) => {  
                if (result && result.length > 0) {
                    // ... (rest of your code)
                } else {
                    // No children found.  Update the row to remove the expand icon.
                    this.gridData = this.removeExpandIcon(rowName, this.gridData);
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
                // ... (error handling)
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}

    getNewDataWithChildren(rowName, data, children) {
        return data.map((row) => {
            let hasChildrenContent = false;
            if (
                Object.prototype.hasOwnProperty.call(row, "_children") &&
                Array.isArray(row._children)
            ) {
                hasChildrenContent = row._children.length > 0; // Check if *already* loaded
            }

            if (row.Id === rowName) {
                row._children = children;  // Set the children
            } else if (row._children) { // Use _children directly.  More efficient
                row._children = this.getNewDataWithChildren(rowName, row._children, children);
            }
            return row;
        });
    }


    removeExpandIcon(rowName, data) {
        return data.map(row => {
            if (row.Id === rowName) {
                // Critically important:  Set _children to undefined.
                return { ...row, _children: undefined };
            } else if (row._children) {
                return { ...row, _children: this.removeExpandIcon(rowName, row._children) };
            }
            return row;
        });
    }
}
