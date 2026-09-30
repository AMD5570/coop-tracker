import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import Tooltip from '@mui/material/Tooltip';

interface RowButtonProps {
    applicationId: number;
    isEditing: boolean;
    isSaving: boolean;
    onDeleteSuccess: (application_id: number) => void;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
}

export default function RowButtons({
    applicationId,
    isEditing,
    isSaving,
    onDeleteSuccess,
    onEdit,
    onSave,
    onCancel,
}: RowButtonProps) {

    const handleDelete = async () => {
        try {
            const response = await fetch (`/coop-tracker/api/applications/${applicationId}`, {
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
        {isEditing ? (
            <>
                <Tooltip title="Save">
                    <IconButton onClick={onSave} aria-label="save application" size="large" disabled={isSaving}>
                        <SaveIcon fontSize="inherit" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Cancel">
                    <IconButton onClick={onCancel} aria-label="cancel editing" size="large" disabled={isSaving}>
                        <CloseIcon fontSize="inherit" />
                    </IconButton>
                </Tooltip>
            </>
        ) : (
            <Tooltip title="Edit">
                <IconButton onClick={onEdit} aria-label="edit application" size="large">
                    <EditIcon fontSize="inherit" />
                </IconButton>
            </Tooltip>
        )}
        <Tooltip title="Delete">
            <IconButton onClick={handleDelete} aria-label="delete application" size="large" disabled={isSaving}>
                <DeleteIcon fontSize="inherit" />
            </IconButton>
        </Tooltip>
    </Stack>
  );
}
