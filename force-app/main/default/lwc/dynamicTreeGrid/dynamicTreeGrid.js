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
        const hasChildren = await hasChildCampaigns({ parentId: campaign.Id });
        
        const campaignData = {
            ...campaign,
            Name: campaign.Name,
            ParentCampaignName: campaign.Parent?.Name,
            campaignUrl: campaign.Id ? `/${campaign.Id}` : undefined,
            parentCampaignUrl: campaign.Parent?.Id ? `/${campaign.Parent.Id}` : undefined,
            Id: campaign.Id,
        };

        // Only add _children if hasChildren is true
        if (hasChildren) {
            campaignData._children = [];
        }
        
        processedData.push(campaignData);
    }
    this.gridData = processedData;
    this.isLoading = false;
}

handleOnToggle(event) {
        const rowName = event.detail.name;
        if (!event.detail.hasChildrenContent && event.detail.isExpanded) {
            this.isLoading = true;
            getChildCampaigns({ parentId: rowName })
                .then(async (result) => {  // Make this an async function
                    if (result && result.length > 0) {
                        const newChildren = [];
                        for (const child of result) {
                            // Check for grandchildren *before* adding
                            const hasGrandChildren = await hasChildCampaigns({ parentId: child.Id });
                            const childData = {
                                ...child,
                                Name: child.Name,
                                ParentCampaignName: child.Parent?.Name,
                                campaignUrl: `/${child.Id}`,
                                parentCampaignUrl: child.Parent?.Id ? `/${child.Parent.Id}` : undefined,
                                Id: child.Id
                            };
                            // Only add _children if hasGrandChildren is true
                            if (hasGrandChildren) {
                                childData._children = [];
                            }
                            newChildren.push(childData);
                            newChildren.push({
                                ...child,
                                _children: hasGrandChildren ? [] : undefined,  // Key change:  [] or undefined
                                Name: child.Name,
                                ParentCampaignName: child.Parent?.Name,
                                campaignUrl: `/${child.Id}`,
                                parentCampaignUrl: child.Parent?.Id ? `/${child.Parent.Id}` : undefined,
                                Id: child.Id
                            });
                        }
                        this.gridData = this.getNewDataWithChildren(rowName, this.gridData, newChildren);
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
                    console.error("Error loading child campaigns", error);
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: "Error Loading Children Campaigns",
                            message: error.body.message,
                            variant: "error"
                        })
                    );
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
