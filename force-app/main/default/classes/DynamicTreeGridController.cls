public with sharing class DynamicTreeGridController {

    @AuraEnabled(cacheable=true)
    public static List<Campaign> getAllParentCampaigns() {
        return [
            SELECT Id, Name, Type, Parent.Name, Parent.Id
            FROM Campaign
            WHERE ParentId = null
            WITH SECURITY_ENFORCED
            ORDER BY Name
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Campaign> getChildCampaigns(Id parentId) {
        return [
            SELECT Id, Name, Type, Parent.Name, Parent.Id
            FROM Campaign
            WHERE ParentId = :parentId
            WITH SECURITY_ENFORCED
            ORDER BY Name
        ];
    }
    
    @AuraEnabled(cacheable=true)
    public static Boolean hasChildCampaigns(Id parentId) {
        return [SELECT COUNT() FROM Campaign WHERE ParentId = :parentId WITH SECURITY_ENFORCED] > 0;
    }
}
