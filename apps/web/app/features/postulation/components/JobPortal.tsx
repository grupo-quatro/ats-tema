"use client"

import { Container, Box, Typography, Card, TextField, InputAdornment, Stack } from "@mui/material";
import { Briefcase, Search } from "lucide-react";
import JobCard from "./JobCard";
import { Job } from "../../../../../../packages/shared-types/src/models/job";

export default function JobPortal() {


    const JOBS_DATA: Job[] = [
        {
            id: "1",
            title: "Backend Developer Node.js",
            department: "Engineering",
            location: "remote",
            city: "Buenos Aires",
            description: "Sumate para escalar microservicios y optimizar bases de datos en MongoDB. Valoramos conocimientos en arquitecturas limpias.",
            requirements: ["Node.js", "Express", "MongoDB", "TypeScript"],
            niceToHave: ["Docker", "AWS"],
            salaryMin: 2500,
            salaryMax: 4000,
            currency: "USD",
            status: "open",
            hiringManagerId: "mgr-01",
            createdAt: new Date("2026-05-01"),
            updatedAt: new Date("2026-05-12"),
            publishedAt: new Date("2026-05-12")
        },
        {
            id: "2",
            title: "UX/UI Designer",
            department: "Product",
            location: "remote",
            city: "Buenos Aires",
            description: "Diseñá interfaces modernas y funcionales. Trabajo codo a codo con el equipo de front para asegurar la fidelidad de los mockups de Figma.",
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
        },
        {
            id: "3",
            title: "Fullstack Developer (React/Python)",
            department: "Engineering",
            location: "hybrid",
            city: "Córdoba",
            description: "Buscamos un perfil versátil que pueda manejar el frontend en React y servicios de inteligencia artificial en Python.",
            requirements: ["React", "Python", "FastAPI"],
            salaryMin: 3000,
            salaryMax: 5000,
            currency: "USD",
            status: "open",
            hiringManagerId: "mgr-01",
            createdAt: new Date("2026-05-03"),
            updatedAt: new Date("2026-05-10"),
            publishedAt: new Date("2026-05-10")
        },
        {
            id: "4",
            title: "QA Automation Engineer",
            department: "Engineering",
            location: "on-site",
            city: "Rosario",
            description: "Responsable de asegurar la calidad mediante tests automatizados (Cypress/Playwright). Implementación de CI/CD.",
            requirements: ["Cypress", "JavaScript", "Selenium"],
            status: "open",
            hiringManagerId: "mgr-03",
            createdAt: new Date("2026-05-04"),
            updatedAt: new Date("2026-05-09"),
            publishedAt: new Date("2026-05-09")
        },
        {
            id: "5",
            title: "Data Analyst",
            department: "Data Science",
            location: "remote",
            city: "Buenos Aires",
            description: "Análisis de grandes volúmenes de datos para la toma de decisiones estratégicas. Experiencia en SQL y visualización de datos.",
            requirements: ["SQL", "Python", "PowerBI", "Tableau"],
            salaryMin: 2200,
            salaryMax: 3800,
            currency: "USD",
            status: "paused",
            hiringManagerId: "mgr-02",
            createdAt: new Date("2026-05-05"),
            updatedAt: new Date("2026-05-08"),
            publishedAt: new Date("2026-05-08")
        }
    ];

    return (
        <Container>
            <Box sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                marginTop: "50px",
                marginBottom: "50px"
            }}>
                <Box sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    p: 2,
                    bgcolor: "primary.main",
                    color: "white",
                    borderRadius: "50%"
                }}>
                    <Briefcase size={40} />
                </Box>
                <Typography variant="h1">Portal de Empleo</Typography>
                <Typography variant="body1">Descubre oportunidades que se ajusten a tu perfil</Typography>
            </Box>
            <Card sx={{ p: 2 }}>
                <TextField
                    fullWidth
                    placeholder="Buscar por título o área..."
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search size={18} color="#94a3b8" />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
            </Card>
            <Box sx={{
                margin: "50px"
            }}>
                <Stack spacing={3}>
                    {JOBS_DATA.map((job) => (
                        // Pasamos el objeto completo 'job' como prop
                        <JobCard
                            key={job.id}
                            job={job}
                        />
                    ))}
                </Stack>
            </Box>
        </Container>
    );
}