import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Tooltip from '@mui/material/Tooltip';

interface RowButtonProps {
    applicationId: number;
    onDeleteSuccess: (application_id: number) => void;
}

export default function RowButtons({ applicationId, onDeleteSuccess }: RowButtonProps ) {

    const handleDelete = async () => {
        try {
            const response = await fetch (`http://127.0.0.1:8000/api/applications/${applicationId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                onDeleteSuccess(applicationId);
            }
        } catch (error) {
            error instanceof Error ? error.message : 'An unknown error has occurred.';
        }
    }

  return (
    <Stack direction="row" spacing={1}>
        <Tooltip title="Edit">
            <IconButton aria-label="delete" size="large">
                <EditIcon fontSize="inherit" />
            </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
            <IconButton onClick={handleDelete} aria-label="delete" size="large">
                <DeleteIcon fontSize="inherit" />
            </IconButton>
        </Tooltip>
    </Stack>
  );
}
