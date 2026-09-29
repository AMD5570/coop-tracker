import * as React from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { createTheme, ThemeProvider } from '@mui/material/styles';

export interface Application {
  application_id: number;
  position_title: string;
  location: string | null;
  used_resume: boolean;
  used_cover_letter: boolean;
  interest_rating: number;
  notes: string | null;
  applied_date: string;
  company_name: string;
  contact_info: string | null;
}

interface ApplicationsTableProps {
  rows: Application[];
}

const theme = createTheme({
    components: {
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            fontSize: '1.1em',
            // textAlign: 'center',
          },
        },
      },
    },
  });

export default function ApplicationsTable({ rows }: ApplicationsTableProps) {

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  };

  const visibleRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <ThemeProvider theme={theme}>
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader aria-label="job applications">
            <TableHead>
                <TableRow>
                    <TableCell>Position</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Applied</TableCell>
                    <TableCell>Interest</TableCell>
                    <TableCell>Resume</TableCell>
                    <TableCell>Cover letter</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {visibleRows.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={7} align="center">
                    No applications yet
                    </TableCell>
                </TableRow>
                ) : (
                visibleRows.map((application) => (
                    <TableRow hover key={application.application_id}>
                    <TableCell component="th" scope="row">
                        {application.position_title}
                    </TableCell>
                    <TableCell>{application.company_name}</TableCell>
                    <TableCell>{application.location || 'Not specified'}</TableCell>
                    <TableCell>{application.applied_date.split('T')[0]}</TableCell>
                    <TableCell>{application.interest_rating}/5</TableCell>
                    <TableCell>{application.used_resume ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{application.used_cover_letter ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                ))
                )}
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