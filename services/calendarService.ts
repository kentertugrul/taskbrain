import { CalendarConfig, CalendarEvent } from "../types";

// Mock data for simulation
const MOCK_CALENDARS: CalendarConfig[] = [
    { id: 'cal-1', summary: 'Personal', color: '#4285F4', selected: true, primary: true },
    { id: 'cal-2', summary: 'Work (Scentcraft)', color: '#EA4335', selected: true },
    { id: 'cal-3', summary: 'Family', color: '#FBBC05', selected: false },
    { id: 'cal-4', summary: 'Holidays', color: '#34A853', selected: true }
];

const MOCK_EVENTS: CalendarEvent[] = [
    { id: 'evt-1', title: 'Deep Work Session', start: new Date(Date.now() + 3600000).toISOString(), end: new Date(Date.now() + 7200000).toISOString(), calendarId: 'cal-1' },
    { id: 'evt-2', title: 'Team Sync', start: new Date(Date.now() + 86400000).toISOString(), end: new Date(Date.now() + 90000000).toISOString(), calendarId: 'cal-2' },
    { id: 'evt-3', title: 'Lunch with Mom', start: new Date(Date.now() + 172800000).toISOString(), end: new Date(Date.now() + 180000000).toISOString(), calendarId: 'cal-1' }
];

export const listCalendars = async (accessToken?: string): Promise<CalendarConfig[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (!accessToken) {
        return MOCK_CALENDARS;
    }
    
    // In a real app with actual token, we would fetch from https://www.googleapis.com/calendar/v3/users/me/calendarList
    // For now, return mock data even with token
    return MOCK_CALENDARS;
};

export const listEvents = async (calendarId: string, accessToken?: string): Promise<CalendarEvent[]> => {
    if (!accessToken) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 400));
        return MOCK_EVENTS.filter(e => e.calendarId === calendarId);
    }

    // In a real app, we would fetch from https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
    return [];
};

// Helper to load the Google Identity Services script
export const loadGoogleScript = () => {
    const src = "https://accounts.google.com/gsi/client";
    const script = document.querySelector(`script[src="${src}"]`);
    if (script) return;
    
    const newScript = document.createElement("script");
    newScript.src = src;
    newScript.async = true;
    newScript.defer = true;
    document.body.appendChild(newScript);
};

