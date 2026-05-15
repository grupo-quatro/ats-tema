import JobPortal from "./features/postulation/components/JobPortal";
import JobDescription from "./features/postulation/components/JobDescription";
import { Job as JobType } from "../../../packages/shared-types/src/models/job";

// 2. Aplicá el tipo a tu constante
const MyJob: JobType = {
  id: "2",
  title: "UX/UI Designer",
  department: "Product",
  location: "remote", // Ahora TS sabe que esto es un JobLocation
  city: "Buenos Aires",
  description: "Diseñá interfaces modernas y funcionales...",
  requirements: ["Figma", "Adobe XD", "Design Systems"],
  niceToHave: ["Framer", "Prototyping"],
  salaryMin: 2000,
  salaryMax: 3500,
  currency: "USD",
  status: "open",
  hiringManagerId: "mgr-02",
  createdAt: new Date("2026-05-02"),
  updatedAt: new Date("2026-05-11"),
  publishedAt: new Date("2026-05-11")
};

export default function Home() {
  return (
    <JobDescription job={MyJob} />
  );
}
