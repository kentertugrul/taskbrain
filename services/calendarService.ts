import { CalendarConfig, CalendarEvent } from "../types";

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// Helper to load the Google Identity Services script
export const loadGoogleScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const src = "https://accounts.google.com/gsi/client";
        const existingScript = document.querySelector(`script[src="${src}"]`);
        
        if (existingScript) {
            resolve();
            return;
        }
        
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.body.appendChild(script);
    });
};

// Initialize Google OAuth
export const initializeGoogleAuth = async (clientId: string): Promise<void> => {
    await loadGoogleScript();
    
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !(window as any).google) {
            reject(new Error('Google Identity Services not loaded'));
            return;
        }

        (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
            callback: (response: any) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    // Token will be handled by the caller
                    resolve();
                }
            },
        });
        
        resolve();
    });
};

// Get access token using Google Identity Services
export const getGoogleAccessToken = (clientId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        console.log('🔵 Loading Google Identity Services script...');
        loadGoogleScript().then(() => {
            console.log('✅ Google Identity Services script loaded');
            
            if (typeof window === 'undefined' || !(window as any).google) {
                console.error('❌ Google Identity Services not available');
                reject(new Error('Google Identity Services not loaded'));
                return;
            }

            console.log('🔵 Initializing OAuth token client...');
            const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
                callback: (response: any) => {
                    console.log('🔵 OAuth callback received:', response);
                    if (response.error) {
                        console.error('❌ OAuth error:', response.error);
                        reject(new Error(response.error));
                    } else {
                        console.log('✅ Access token received in callback');
                        resolve(response.access_token);
                    }
                },
            });

            console.log('🔵 Requesting access token (prompt: consent)...');
            // Request access token
            tokenClient.requestAccessToken({ prompt: 'consent' });
        }).catch((error) => {
            console.error('❌ Failed to load Google Identity Services:', error);
            reject(error);
        });
    });
};

// Refresh access token if needed
const refreshTokenIfNeeded = async (accessToken: string, clientId: string): Promise<string> => {
    // Check if token is expired (Google tokens expire after 1 hour)
    // For now, we'll just return the token and let the API call fail if expired
    // In production, you'd want to check expiration and refresh
    return accessToken;
};

// Make authenticated API request
const apiRequest = async (url: string, accessToken: string): Promise<any> => {
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Token expired. Please reconnect your calendar.');
        }
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error?.message || `API request failed: ${response.status}`);
    }

    return response.json();
};

// List all calendars for the authenticated user
export const listCalendars = async (accessToken?: string): Promise<CalendarConfig[]> => {
    if (!accessToken) {
        throw new Error('Access token required');
    }

    console.log('📡 Fetching calendars from Google Calendar API...');
    console.log('🔑 Using access token:', accessToken.substring(0, 20) + '...');

    try {
        const url = `${GOOGLE_CALENDAR_API}/users/me/calendarList?minAccessRole=reader`;
        console.log('🌐 API URL:', url);
        
        const data = await apiRequest(url, accessToken);
        
        console.log('✅ API Response:', data);
        console.log('📅 Calendars found:', data.items?.length || 0);

        if (!data.items || data.items.length === 0) {
            console.warn('⚠️ No calendars found in response');
            return [];
        }

        // Map Google Calendar format to our CalendarConfig format
        const calendars = data.items.map((cal: any) => ({
            id: cal.id,
            summary: cal.summary || 'Untitled Calendar',
            color: cal.backgroundColor || '#4285F4',
            selected: true, // Default to selected
            primary: cal.primary || false,
        }));
        
        console.log('✅ Mapped calendars:', calendars);
        return calendars;
    } catch (error: any) {
        console.error('❌ Failed to fetch calendars:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack
        });
        throw error;
    }
};

// List events for a specific calendar
export const listEvents = async (
    calendarId: string, 
    accessToken?: string,
    timeMin?: string,
    timeMax?: string
): Promise<CalendarEvent[]> => {
    if (!accessToken) {
        throw new Error('Access token required');
    }

    try {
        const now = new Date();
        const defaultTimeMin = timeMin || now.toISOString();
        const defaultTimeMax = timeMax || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead

        const url = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?` +
            `timeMin=${encodeURIComponent(defaultTimeMin)}&` +
            `timeMax=${encodeURIComponent(defaultTimeMax)}&` +
            `singleEvents=true&` +
            `orderBy=startTime`;

        const data = await apiRequest(url, accessToken);

        if (!data.items || data.items.length === 0) {
            return [];
        }

        // Map Google Calendar events to our CalendarEvent format
        return data.items.map((event: any) => ({
            id: event.id,
            title: event.summary || 'No Title',
            start: event.start?.dateTime || event.start?.date || new Date().toISOString(),
            end: event.end?.dateTime || event.end?.date || new Date().toISOString(),
            calendarId: calendarId,
            description: event.description,
            location: event.location,
        }));
    } catch (error: any) {
        console.error('Failed to fetch events:', error);
        throw error;
    }
};

// Get events from all selected calendars
export const listEventsFromCalendars = async (
    calendars: CalendarConfig[],
    accessToken: string,
    timeMin?: string,
    timeMax?: string
): Promise<CalendarEvent[]> => {
    const selectedCalendars = calendars.filter(cal => cal.selected);
    
    if (selectedCalendars.length === 0) {
        return [];
    }

    try {
        // Fetch events from all selected calendars in parallel
        const eventPromises = selectedCalendars.map(cal => 
            listEvents(cal.id, accessToken, timeMin, timeMax).catch(error => {
                console.error(`Failed to fetch events for calendar ${cal.summary}:`, error);
                return []; // Return empty array on error
            })
        );

        const eventArrays = await Promise.all(eventPromises);
        return eventArrays.flat();
    } catch (error: any) {
        console.error('Failed to fetch events from calendars:', error);
        throw error;
    }
};

