import { applyObservationToVitals, Observation } from '../src/vitals/reducer';

describe('Vitals Reducer', () => {
  describe('SAT observations', () => {
    it('should fold SAT observations into sorted timeline with current and superscore', () => {
      const vitals = {};
      
      const observations: Observation[] = [
        {
          id: '1',
          studentId: 'test',
          kind: 'SAT',
          value: { score: 1360, note: 'baseline' },
          source: 'test',
          at: '2023-08-05',
          createdAt: new Date()
        },
        {
          id: '2',
          studentId: 'test',
          kind: 'SAT',
          value: { score: 1480, note: '+120' },
          source: 'test',
          at: '2023-09-16',
          createdAt: new Date()
        },
        {
          id: '3',
          studentId: 'test',
          kind: 'SAT',
          value: { score: 1530, note: 'final' },
          source: 'test',
          at: '2025-02-11',
          createdAt: new Date()
        },
        {
          id: '4',
          studentId: 'test',
          kind: 'SAT',
          value: { score: 1490, note: 'practice' },
          source: 'test',
          at: '2024-01-30',
          createdAt: new Date()
        }
      ];
      
      let result = vitals;
      for (const obs of observations) {
        result = applyObservationToVitals(result, obs);
      }
      
      expect(result.academics.sat.timeline).toHaveLength(4);
      expect(result.academics.sat.timeline[0].date).toBe('2023-08-05');
      expect(result.academics.sat.timeline[3].date).toBe('2025-02-11');
      expect(result.academics.sat.current).toBe(1530);
      expect(result.academics.sat.superscore).toBe(1530);
    });
  });
  
  describe('GPA observations', () => {
    it('should update GPA values', () => {
      const vitals = {};
      
      const obs: Observation = {
        id: '1',
        studentId: 'test',
        kind: 'GPA',
        value: { weighted: 3.93, unweighted: 3.71, trend: 'up' },
        source: 'transcript',
        at: '2024-06-01',
        createdAt: new Date()
      };
      
      const result = applyObservationToVitals(vitals, obs);
      
      expect(result.academics.gpa.weighted).toBe(3.93);
      expect(result.academics.gpa.unweighted).toBe(3.71);
      expect(result.academics.gpa.trend).toBe('up');
    });
  });
  
  describe('Activity observations', () => {
    it('should append activity timeline events', () => {
      const vitals = {};
      
      const obs1: Observation = {
        id: '1',
        studentId: 'test',
        kind: 'ACTIVITY',
        subtype: 'Synthoria',
        value: { plays: 44, note: 'AI Ethics scene done' },
        source: 'coach note',
        at: '2024-01-06',
        createdAt: new Date()
      };
      
      const obs2: Observation = {
        id: '2',
        studentId: 'test',
        kind: 'ACTIVITY',
        subtype: 'Synthoria.studentsReached',
        value: { studentsReached: 6400 },
        source: 'ExecDoc',
        at: '2024-12-15',
        createdAt: new Date()
      };
      
      let result = vitals;
      result = applyObservationToVitals(result, obs1);
      result = applyObservationToVitals(result, obs2);
      
      expect(result.activities.Synthoria.timeline).toHaveLength(2);
      expect(result.activities.Synthoria.timeline[0].plays).toBe(44);
      expect(result.activities.Synthoria.timeline[1].studentsReached).toBe(6400);
    });
  });
});