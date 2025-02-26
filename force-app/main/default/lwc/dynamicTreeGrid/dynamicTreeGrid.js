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

// Global Constants
const COLS = [
        {
                fieldName: "CampaignUrl",
                label: "Campaign Name",
                type: "url",
                typeAttributes: { label: { fieldName: "Name" }, target: "_blank" }
        },
        {
                fieldName: "ParentCampaignUrl",
                label: "Parent Campaign",
                type: "url",
                typeAttributes: { label: { fieldName: "ParentCampaignName" }, target: "_blank" }
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
                        this.gridData = data.map((campaign) => ({
                                _children: [],
                                ...campaign,
                                ParentCampaignName: campaign.Parent?.Name,
                                CampaignUrl: `/lightning/r/Campaign/${campaign.Id}/view`,
                                ParentCampaignUrl: campaign.Parent?.Id
                                        ? `/lightning/r/Campaign/${campaign.Parent.Id}/view`
                                        : null
                        }));
                        this.isLoading = false;
                }
        }

        handleOnToggle(event) {
                console.log(event.detail.name);
                console.log(event.detail.hasChildrenContent);
                console.log(event.detail.isExpanded);
                const rowName = event.detail.name;
                if (!event.detail.hasChildrenContent && event.detail.isExpanded) {
                        this.isLoading = true;
                        getChildCampaigns({ parentId: rowName })
                                .then((result) => {
                                        console.log(result);
                                        if (result && result.length > 0) {
                                                const newChildren = result.map((child) => ({
                                                        _children: [],
                                                        ...child,
                                                        ParentCampaignName: child.Parent?.Name,
                                                        CampaignUrl: `/lightning/r/Campaign/${child.Id}/view`,
                                                        ParentCampaignUrl: child.Parent?.Id
                                                                ? `/lightning/r/Campaign/${child.Parent.Id}/view`
                                                                : null
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
                                        console.log("Error loading child campaigns", error);
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
