import {Card, CardContent, useTheme, TextField} from "@mui/material";
import React, {FC} from "react";


export const Note: FC<{studyId: number}> = ({studyId}) => {
    const theme = useTheme()
    return (
        <Card
            sx={{
                margin: theme.spacing(2),
            }}
        >
            <CardContent>
                <TextField />
            </CardContent>
        </Card>
    )
}