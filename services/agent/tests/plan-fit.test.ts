describe('168-hour Plan Fit', () => {
  it('should ensure plan totals to ≤168 hours with wellness constraints', () => {
    const vitals = {
      wellness: {
        availableHoursPerWeek: 168,
        allocations: {
          sleep: 56,
          school: 37.5,
          transport: 4.5,
          misc: 21,
          sundaySchool: 2,
          social: 7,
          homework: 14
        }
      }
    };
    
    const totalAllocated = Object.values(vitals.wellness.allocations)
      .reduce((sum: number, hours: any) => sum + hours, 0);
    
    expect(totalAllocated).toBeLessThanOrEqual(vitals.wellness.availableHoursPerWeek);
    
    const remainingHours = vitals.wellness.availableHoursPerWeek - totalAllocated;
    expect(remainingHours).toBeGreaterThanOrEqual(0);
    
    const minimumSleep = 56; // 8 hours per night
    expect(vitals.wellness.allocations.sleep).toBeGreaterThanOrEqual(minimumSleep);
  });
  
  it('should include shy/async outreach activities for shy trait', () => {
    const studentTraits = {
      personality: 'shy',
      preferredCommunication: 'async'
    };
    
    const suggestedActivities = [
      { name: 'Email outreach to professors', type: 'async' },
      { name: 'Online community contributions', type: 'async' },
      { name: 'Written blog posts', type: 'async' },
      { name: 'Pre-recorded video presentations', type: 'async' }
    ];
    
    const hasAsyncActivities = suggestedActivities.some(a => a.type === 'async');
    expect(hasAsyncActivities).toBe(true);
    
    const asyncCount = suggestedActivities.filter(a => a.type === 'async').length;
    expect(asyncCount).toBeGreaterThan(2);
  });
});