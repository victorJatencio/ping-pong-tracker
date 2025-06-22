describe('Dashboard Recent Matches Card', () => {
  beforeEach(() => {
    cy.visit('/dashboard');
  });

  it('displays recent matches card', () => {
    // Check that the Recent Matches card is present
    cy.contains('Recent Matches').should('be.visible');

    // Check that the "View All Matches" link works
    cy.contains('View All Matches').click();
    cy.url().should('include', '/history');
  });
});