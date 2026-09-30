import * as React from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import RowButtons from './RowButtons/RowButtons';

export type ApplicationStatus = 'Pending' | 'Declined' | 'Interview' | 'Offered' | 'Accepted';

const applicationStatuses: ApplicationStatus[] = ['Pending', 'Declined', 'Interview', 'Offered', 'Accepted'];

export interface Application {
  application_id: number;
  position_title: string;
  location: string | null;
  used_resume: boolean;
  used_cover_letter: boolean;
  interest_rating: number;
  notes: string | null;
  status: 'Pending' | 'Declined' | 'Interview' | 'Offered' | 'Accepted';
  applied_date: string;
  company_name: string;
  contact_info: string | null;
}

interface ApplicationDraft {
  position_title: string;
  company_name: string;
  location: string;
  interest_rating: string;
  used_resume: boolean;
  used_cover_letter: boolean;
  notes: string;
  status: ApplicationStatus;
}

interface ApplicationsTableProps {
  rows: Application[];
  onDeleteSuccess: (application_id: number) => void;
  onStatusChange: (applicationId: number, status: ApplicationStatus) => void;
  onCreateSuccess: (application: Application) => void;
  onUpdateSuccess: (application: Application) => void;
}

const createEmptyDraft = (): ApplicationDraft => ({
  position_title: '',
  company_name: '',
  location: '',
  interest_rating: '3',
  used_resume: false,
  used_cover_letter: false,
  notes: '',
  status: 'Pending',
});

const theme = createTheme({
    components: {
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            fontSize: '1.1em',
          },
        },
      },
    },
  });

export default function ApplicationsTable({
  rows,
  onDeleteSuccess,
  onStatusChange,
  onCreateSuccess,
  onUpdateSuccess,
}: ApplicationsTableProps) {

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [updatingApplicationIds, setUpdatingApplicationIds] = React.useState<Set<number>>(new Set());
  const [draft, setDraft] = React.useState<ApplicationDraft>(createEmptyDraft);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const draftRowRef = React.useRef<HTMLTableRowElement>(null);
  const [editingApplicationId, setEditingApplicationId] = React.useState<number | null>(null);
  const [editDraft, setEditDraft] = React.useState<ApplicationDraft | null>(null);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  const updateDraft = (changes: Partial<ApplicationDraft>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setStatusError(null);
  };

  const saveDraft = async () => {
    if (isSavingDraft) return;

    const positionTitle = draft.position_title.trim();
    const companyName = draft.company_name.trim();
    if (!positionTitle && !companyName) return;
    if (!positionTitle || !companyName) {
      setStatusError('Position and company are required to save an application.');
      return;
    }

    setIsSavingDraft(true);
    setStatusError(null);

    try {
      const response = await fetch('/coop-tracker/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position_title: positionTitle,
          company_name: companyName,
          location: draft.location.trim() || null,
          interest_rating: Number(draft.interest_rating),
          used_resume: draft.used_resume,
          used_cover_letter: draft.used_cover_letter,
          notes: draft.notes,
          status: draft.status,
        }),
      });

      if (!response.ok) {
        throw new Error(`Could not save application (HTTP ${response.status}).`);
      }

      const application = (await response.json()) as Application;
      onCreateSuccess(application);
      setDraft(createEmptyDraft());
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Could not save application.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleDraftBlur = () => {
    window.setTimeout(() => {
      if (draftRowRef.current && !draftRowRef.current.contains(document.activeElement)) {
        void saveDraft();
      }
    }, 0);
  };

  const startEditing = (application: Application) => {
    setEditingApplicationId(application.application_id);
    setEditDraft({
      position_title: application.position_title,
      company_name: application.company_name,
      location: application.location ?? '',
      interest_rating: String(application.interest_rating),
      used_resume: application.used_resume,
      used_cover_letter: application.used_cover_letter,
      notes: application.notes ?? '',
      status: application.status,
    });
    setStatusError(null);
  };

  const updateEditDraft = (changes: Partial<ApplicationDraft>) => {
    setEditDraft((current) => current ? { ...current, ...changes } : current);
    setStatusError(null);
  };

  const cancelEditing = () => {
    setEditingApplicationId(null);
    setEditDraft(null);
    setStatusError(null);
  };

  const saveEdit = async (applicationId: number) => {
    if (!editDraft || isSavingEdit) return;

    const positionTitle = editDraft.position_title.trim();
    const companyName = editDraft.company_name.trim();
    const interestRating = Number(editDraft.interest_rating);
    if (!positionTitle || !companyName) {
      setStatusError('Position and company are required.');
      return;
    }
    if (!Number.isInteger(interestRating) || interestRating < 1 || interestRating > 5) {
      setStatusError('Interest rating must be between 1 and 5.');
      return;
    }

    setIsSavingEdit(true);
    setStatusError(null);
    try {
      const response = await fetch(`/coop-tracker/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position_title: positionTitle,
          company_name: companyName,
          location: editDraft.location.trim() || null,
          interest_rating: interestRating,
          used_resume: editDraft.used_resume,
          used_cover_letter: editDraft.used_cover_letter,
          notes: editDraft.notes,
          status: editDraft.status,
        }),
      });

      if (!response.ok) {
        throw new Error(`Could not save changes (HTTP ${response.status}).`);
      }

      const application = (await response.json()) as Application;
      onUpdateSuccess(application);
      setEditingApplicationId(null);
      setEditDraft(null);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Could not save changes.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleStatusChange = async (applicationId: number, nextStatus: ApplicationStatus) => {
    setStatusError(null);
    setUpdatingApplicationIds((current) => new Set(current).add(applicationId));

    try {
      const response = await fetch(`/coop-tracker/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error(`Could not update status (HTTP ${response.status}).`);
      }

      onStatusChange(applicationId, nextStatus);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Could not update application status.');
    } finally {
      setUpdatingApplicationIds((current) => {
        const next = new Set(current);
        next.delete(applicationId);
        return next;
      });
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  };

  const visibleRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "";
      case "Declined":
        return "red";
      case "Interview":
        return "green";
      case "Offered":
        return "blue";
      case "Accepted":
        return "gold";
    }
  }

  return (
    <ThemeProvider theme={theme}>
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {statusError && <Alert severity="error">{statusError}</Alert>}
        <TableContainer sx={{ maxHeight: '80vh' }}>
            <Table stickyHeader aria-label="job applications">
            <TableHead>
                <TableRow>
                    <TableCell></TableCell>
                    <TableCell>Position</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Applied</TableCell>
                    <TableCell>Interest</TableCell>
                    <TableCell>Resume</TableCell>
                    <TableCell>Cover letter</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell></TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {visibleRows.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={11} align="center">
                    No applications yet
                    </TableCell>
                </TableRow>
                ) : (
                visibleRows.map((application, rowIndex) => {
                  const isEditing = editingApplicationId === application.application_id;
                  const rowDraft = isEditing ? editDraft : null;

                  return (
                    <TableRow
                      key={application.application_id}
                      sx={{
                        height: '1em',
                        backgroundColor: `rgb(from ${getStatusColor(application.status)} r g b / 0.2)`,
                        fontWeight: application.status == 'Accepted' ? '700' : '',
                      }}
                    >
                      <TableCell>{page * rowsPerPage + rowIndex + 1}</TableCell>
                      <TableCell component="th" scope="row">
                        {rowDraft ? (
                          <TextField
                            size="small"
                            value={rowDraft.position_title}
                            aria-label="Edit position title"
                            disabled={isSavingEdit}
                            onChange={(event) => updateEditDraft({ position_title: event.target.value })}
                          />
                        ) : application.position_title}
                      </TableCell>
                      <TableCell>
                        {rowDraft ? (
                          <TextField
                            size="small"
                            value={rowDraft.company_name}
                            aria-label="Edit company name"
                            disabled={isSavingEdit}
                            onChange={(event) => updateEditDraft({ company_name: event.target.value })}
                          />
                        ) : application.company_name}
                      </TableCell>
                      <TableCell>
                        {rowDraft ? (
                          <TextField
                            size="small"
                            value={rowDraft.location}
                            aria-label="Edit location"
                            disabled={isSavingEdit}
                            onChange={(event) => updateEditDraft({ location: event.target.value })}
                          />
                        ) : application.location || 'Not specified'}
                      </TableCell>
                      <TableCell>{application.applied_date.split('T')[0]}</TableCell>
                      <TableCell>
                        {rowDraft ? (
                          <TextField
                            size="small"
                            type="number"
                            value={rowDraft.interest_rating}
                            aria-label="Edit interest rating"
                            disabled={isSavingEdit}
                            slotProps={{ htmlInput: { min: 1, max: 5 } }}
                            onChange={(event) => updateEditDraft({ interest_rating: event.target.value })}
                          />
                        ) : `${application.interest_rating}/5`}
                      </TableCell>
                      <TableCell>
                        {rowDraft ? (
                          <Select
                            native
                            size="small"
                            value={String(rowDraft.used_resume)}
                            aria-label="Edit resume usage"
                            disabled={isSavingEdit}
                            onChange={(event) => updateEditDraft({ used_resume: event.target.value === 'true' })}
                          >
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </Select>
                        ) : application.used_resume ? 'Yes' : 'No'}
                      </TableCell>
                      <TableCell>
                        {rowDraft ? (
                          <Select
                            native
                            size="small"
                            value={String(rowDraft.used_cover_letter)}
                            aria-label="Edit cover letter usage"
                            disabled={isSavingEdit}
                            onChange={(event) => updateEditDraft({ used_cover_letter: event.target.value === 'true' })}
                          >
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </Select>
                        ) : application.used_cover_letter ? 'Yes' : 'No'}
                      </TableCell>
                      <TableCell>
                        {rowDraft ? (
                          <TextField
                            size="small"
                            value={rowDraft.notes}
                            aria-label="Edit notes"
                            disabled={isSavingEdit}
                            onChange={(event) => updateEditDraft({ notes: event.target.value })}
                          />
                        ) : application.notes}
                      </TableCell>
                      <TableCell>
                        {rowDraft ? (
                          <Select
                            native
                            size="small"
                            value={rowDraft.status}
                            aria-label="Edit application status"
                            disabled={isSavingEdit}
                            onChange={(event) => updateEditDraft({ status: event.target.value as ApplicationStatus })}
                          >
                            {applicationStatuses.map((applicationStatus) => (
                              <option key={applicationStatus} value={applicationStatus}>{applicationStatus}</option>
                            ))}
                          </Select>
                        ) : (
                          <Select
                            sx={{ width: '10em' }}
                            size="small"
                            value={application.status}
                            aria-label={`Status for ${application.position_title}`}
                            disabled={updatingApplicationIds.has(application.application_id)}
                            onChange={(event) => void handleStatusChange(
                              application.application_id,
                              event.target.value as ApplicationStatus,
                            )}
                          >
                            {applicationStatuses.map((applicationStatus) => (
                              <MenuItem key={applicationStatus} value={applicationStatus}>{applicationStatus}</MenuItem>
                            ))}
                          </Select>
                        )}
                      </TableCell>
                      <TableCell width="30px">
                        <RowButtons
                          applicationId={application.application_id}
                          isEditing={isEditing}
                          isSaving={isSavingEdit}
                          onDeleteSuccess={onDeleteSuccess}
                          onEdit={() => startEditing(application)}
                          onSave={() => void saveEdit(application.application_id)}
                          onCancel={cancelEditing}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
                )}
                <TableRow ref={draftRowRef} onBlur={handleDraftBlur}>
                  <TableCell>{rows.length + 1}</TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      placeholder="Position"
                      aria-label="New position title"
                      value={draft.position_title}
                      disabled={isSavingDraft}
                      onChange={(event) => updateDraft({ position_title: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      placeholder="Company"
                      aria-label="New company name"
                      value={draft.company_name}
                      disabled={isSavingDraft}
                      onChange={(event) => updateDraft({ company_name: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      placeholder="Location"
                      aria-label="New location"
                      value={draft.location}
                      disabled={isSavingDraft}
                      onChange={(event) => updateDraft({ location: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>On save</TableCell>
                  <TableCell>
                    <Select
                      native
                      size="small"
                      value={draft.interest_rating}
                      aria-label="New interest rating"
                      disabled={isSavingDraft}
                      onChange={(event) => updateDraft({ interest_rating: event.target.value })}
                    >
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <option key={rating} value={rating}>{rating}/5</option>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      native
                      size="small"
                      value={String(draft.used_resume)}
                      aria-label="New resume usage"
                      disabled={isSavingDraft}
                      onChange={(event) => updateDraft({ used_resume: event.target.value === 'true' })}
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      native
                      size="small"
                      value={String(draft.used_cover_letter)}
                      aria-label="New cover letter usage"
                      disabled={isSavingDraft}
                      onChange={(event) => updateDraft({ used_cover_letter: event.target.value === 'true' })}
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      placeholder="Notes"
                      aria-label="New notes"
                      value={draft.notes}
                      disabled={isSavingDraft}
                      onChange={(event) => updateDraft({ notes: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      native
                      size="small"
                      value={draft.status}
                      aria-label="New application status"
                      disabled={isSavingDraft}
                      onChange={(event) => updateDraft({ status: event.target.value as ApplicationStatus })}
                    >
                      {applicationStatuses.map((applicationStatus) => (
                        <option key={applicationStatus} value={applicationStatus}>{applicationStatus}</option>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell />
                </TableRow>
            </TableBody>
            </Table>
        </TableContainer>
        <TablePagination
            rowsPerPageOptions={[10, 25, 100]}
            component="div"
            count={rows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
        />
        </Paper>
    </ThemeProvider>
  );
}