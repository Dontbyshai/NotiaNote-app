export interface BaseDriver {
    login(username: string, password: string, extra?: any): Promise<any>;
    logout(): Promise<void>;
    // Common escolarity methods (to be implemented by drivers)
    getGrades?(): Promise<any>;
    getTimetable?(date: string): Promise<any>;
    getHomework?(date: string): Promise<any>;
}
