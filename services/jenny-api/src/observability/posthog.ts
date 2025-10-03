import { PostHog } from 'posthog-node';
export const ph = process.env.POSTHOG_API_KEY
  ? new PostHog(process.env.POSTHOG_API_KEY!, { host: process.env.POSTHOG_HOST })
  : null;
export function captureEvent(distinctId:string,event:string,properties?:Record<string,any>){
  if(!ph) return;
  ph.capture({ distinctId, event, properties });
}