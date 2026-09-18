import { serve } from "inngest/next";
import { inngest, organizationJob, publicationJob } from "../../../lib/jobs";
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [organizationJob, publicationJob],
});
export const maxDuration = 60;
