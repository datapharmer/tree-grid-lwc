@IsTest
public class DynamicTreeGridControllerTest {

    @IsTest
    static void testGetAllParentCampaigns() {
        // Create parent campaigns
        Campaign parent1 = new Campaign(Name='Parent Campaign 1');
        insert parent1;

        Campaign parent2 = new Campaign(Name='Parent Campaign 2');
        insert parent2;

        // Create child campaigns (should not be included in parent list)
        Campaign child1 = new Campaign(Name='Child Campaign 1', ParentId=parent1.Id);
        insert child1;

        // Call the method
        List<Campaign> parentCampaigns = DynamicTreeGridController.getAllParentCampaigns();

        // Assertions
        System.assertEquals(2, parentCampaigns.size(), 'Should return only parent campaigns');
        System.assertEquals('Parent Campaign 1', parentCampaigns[0].Name, 'First parent campaign name mismatch');
        System.assertEquals('Parent Campaign 2', parentCampaigns[1].Name, 'Second parent campaign name mismatch');
        System.assertEquals(null, parentCampaigns[0].ParentId, 'Parent should not have a parent');
        System.assertEquals(null, parentCampaigns[1].ParentId, 'Parent should not have a parent');
    }

    @IsTest
    static void testGetChildCampaigns() {
        // Create parent campaign
        Campaign parent = new Campaign(Name='Parent Campaign');
        insert parent;

        // Create child campaigns
        Campaign child1 = new Campaign(Name='Child Campaign 1', ParentId=parent.Id);
        insert child1;

        Campaign child2 = new Campaign(Name='Child Campaign 2', ParentId=parent.Id);
        insert child2;

        // Call the method
        List<Campaign> childCampaigns = DynamicTreeGridController.getChildCampaigns(parent.Id);

        // Assertions
        System.assertEquals(2, childCampaigns.size(), 'Should return child campaigns');
        System.assertEquals('Child Campaign 1', childCampaigns[0].Name, 'First child campaign name mismatch');
        System.assertEquals('Child Campaign 2', childCampaigns[1].Name, 'Second child campaign name mismatch');
        System.assertEquals(parent.Id, childCampaigns[0].ParentId, 'Child should have the correct parent');
        System.assertEquals(parent.Id, childCampaigns[1].ParentId, 'Child should have the correct parent');
    }

    @IsTest
    static void testHasChildCampaigns_HasChildren() {
        // Create parent campaign
        Campaign parent = new Campaign(Name='Parent Campaign');
        insert parent;

        // Create child campaign
        Campaign child = new Campaign(Name='Child Campaign', ParentId=parent.Id);
        insert child;

        // Call the method
        Boolean hasChildren = DynamicTreeGridController.hasChildCampaigns(parent.Id);

        // Assertions
        System.assertEquals(true, hasChildren, 'Should return true if parent has children');
    }

    @IsTest
    static void testHasChildCampaigns_NoChildren() {
        // Create parent campaign
        Campaign parent = new Campaign(Name='Parent Campaign');
        insert parent;

        // Call the method
        Boolean hasChildren = DynamicTreeGridController.hasChildCampaigns(parent.Id);

        // Assertions
        System.assertEquals(false, hasChildren, 'Should return false if parent has no children');
    }

 @IsTest
    static void testHasChildCampaigns_NullParentId() {
        // Create parent campaign
        Campaign parent = new Campaign(Name='Parent Campaign');
        insert parent;

        // Create child campaign
        Campaign child = new Campaign(Name='Child Campaign', ParentId=parent.Id);
        insert child;

        Campaign parent2 = new Campaign(Name='Parent Campaign 2');
        insert parent2;

        Boolean hasChildren = DynamicTreeGridController.hasChildCampaigns(null);
        System.assertEquals(true, hasChildren, 'Should return true if parentId is null and a parent exists.');
    }

    @IsTest
    static void testGetChildCampaigns_NoChildren() {
        // Create parent campaign
        Campaign parent = new Campaign(Name='Parent Campaign');
        insert parent;

        // Call the method
        List<Campaign> childCampaigns = DynamicTreeGridController.getChildCampaigns(parent.Id);

        // Assertions
        System.assertEquals(0, childCampaigns.size(), 'Should return an empty list if parent has no children');
    }
}
