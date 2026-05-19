"use client";

import { Container, Box, Typography } from "@mui/material";
import PositionsFilters from "./PositionsFilters";
import PositionsTable from "./PositionsTable";
import { JOBS_DATA } from "../../features/jobs/services/jobs";
import { Settings } from "lucide-react";

export default function PositionsPage() {
    return (
        <Container maxWidth="lg" sx={{ py: 6 }}>
            <Box>
                <PositionsFilters />

                <PositionsTable jobs={JOBS_DATA} />
            </Box>
        </Container>
    );
}
