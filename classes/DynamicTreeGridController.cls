public with sharing class DynamicTreeGridController {
	@AuraEnabled(cacheable=true)
	public static List<Account> getAllParentCampaigns() {
		return [SELECT Name, Type FROM Campaign WHERE ParentId = NULL LIMIT 20];
	}

	@AuraEnabled
	public static List<Account> getChildCampaigns(Id parentId) {
		return [
			SELECT Name, Type, Parent.Name
			FROM Campaign
			WHERE ParentId = :parentId
		];
	}
}
