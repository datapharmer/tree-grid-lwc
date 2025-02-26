import { LightningElement, wire } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

// Import Apex methods
import getAllParentCampaigns from "@salesforce/apex/DynamicTreeGridController.getAllParentCampaigns";
import getChildCampaigns from "@salesforce/apex/DynamicTreeGridController.getChildCampaigns";

// Global Constants
const COLS = [
    {
        fieldName: "Name",
        label: "Campaign Name",
        type: "text",
        cellAttributes: {
            class: { fieldName: "campaignLinkClass" },
        },
    },
    {
        fieldName: "ParentCampaignName",
        label: "Parent Campaign",
        type: "text",
        cellAttributes: {
            class: { fieldName: "parentCampaignLinkClass" },
        },
    },
    { fieldName: "Type", label: "Campaign Type" }
];

export default class DynamicTreeGrid extends LightningElement {
    gridColumns = COLS;
    isLoading = true;
    gridData = [];

    @wire(getAllParentCampaigns, {})
    parentCampaigns({ error, data }) {
        if (error) {
            console.error("Error loading campaigns", error);
        } else if (data) {
            this.gridData = data.map((campaign) => ({
                _children: [],
                ...campaign,
                ParentCampaignName: campaign.Parent?.Name,
                campaignLinkClass: campaign.Id ? "clickable-link" : "",
                parentCampaignLinkClass: campaign.Parent?.Id ? "clickable-link" : "",
            }));
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
                        const newChildren = result.map((child) => ({
                            _children: [],
                            ...child,
                            ParentCampaignName: child.Parent?.Name,
                            campaignLinkClass: child.Id ? "clickable-link" : "",
                            parentCampaignLinkClass: child.Parent?.Id ? "clickable-link" : "",
                        }));
                        this.gridData = this.getNewDataWithChildren(
                            rowName,
                            this.gridData,
                            newChildren
                        );
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
                            title: "Error Loading Child Campaigns",
                            message: error?.message,
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
            if (row.Id === rowName) {
                row._children = children;
            } else if (row._children && row._children.length > 0) {
                row._children = this.getNewDataWithChildren(rowName, row._children, children);
            }
            return row;
        });
    }

    handleClick(event) {
        const recordId = event.target.dataset.id;
        if (recordId) {
            window.open(`/lightning/r/Campaign/${recordId}/view`, "_blank");
        }
    }
}
