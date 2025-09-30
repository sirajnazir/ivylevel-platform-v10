export type Vitals = any;
export interface Observation {
    id: string;
    studentId: string;
    kind: string;
    subtype?: string | null;
    value: any;
    source: string;
    at: Date | string;
    createdAt: Date;
}
export declare function applyObservationToVitals(v: Vitals, o: Observation): Vitals;
