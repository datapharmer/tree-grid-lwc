public with sharing class DynamicTreeGridController {
	@AuraEnabled(cacheable=true)
	public static List<Campaign> getAllParentCampaigns() {
		return [SELECT Name, Type FROM Campaign WHERE ParentId = NULL LIMIT 20];
	}

	@AuraEnabled
	public static List<Campaign> getChildCampaigns(Id parentId) {
		return [
			SELECT Name, Type, Parent.Name
			FROM Campaign
			WHERE ParentId = :parentId
		];
	}
}
