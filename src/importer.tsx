import {
    Container,
    Button,
    LinearProgress,
    LinearProgressProps,
    Typography,
    FormControl,
    FormLabel,
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Select,
    CircularProgress,
    Grid,
    Radio,
} from '@mui/material';
import csvParse from './csv-parse';
import { createContext, Fragment, useContext, useMemo, useState } from 'react';
import readFileToString from './readFileToString';
import { GridApi } from 'ag-grid-community';

const headerOrigins = ['imported', 'existing'] as const;
type HeaderOrigin = typeof headerOrigins[number];
type Pair = Record<HeaderOrigin, string>;
type ImportReport<TData> = {
    rowsToMerge: { existingIndex: number; row: Partial<TData> }[];
    rowsToAdd: TData[];
};
type Status = 'fileSizeError' | 'progress' | 'pairing' | 'report';
type Option = { label: string; value: string };
type State = {
    status: Status;
    columnPairs: Pair[];
    mergeColumnIndex: number;
    progress: number | null | undefined;
    dialogOpen: boolean;
    fileSizeMb: number;
    importedHeaders: Option[];
};

const DEFAULT_PAIR_STATE: Pair = { existing: '', imported: '' };

const DEFAULT_STATE: State = {
    status: 'progress',
    columnPairs: [],
    mergeColumnIndex: -1,
    progress: null,
    dialogOpen: false,
    importedHeaders: [],
    fileSizeMb: 0,
};

type Context = State & {
    existingHeaders: Option[];
    setState: (update: Partial<State>) => void;
};

const ImporterContext = createContext<Context>({
    ...DEFAULT_STATE,
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    setState: (update: Partial<State>) => {},
    existingHeaders: [],
});

const useImporterContext = () => useContext<Context>(ImporterContext);

function Report({ rowsToAdd, rowsToMerge }: ImportReport<unknown>) {
    return (
        <>
            <Typography variant="subtitle1">
                {rowsToMerge.length || 0} rows will be updated.
            </Typography>
            <Typography variant="subtitle1">
                {rowsToAdd.length || 0} rows will be added.
            </Typography>
        </>
    );
}

function Progress(props: LinearProgressProps) {
    const { progress } = useImporterContext();

    return (
        <Container sx={{ display: 'flex', alignItems: 'center' }}>
            <Container sx={{ width: '100%', mr: 1 }}>
                <LinearProgress
                    variant="determinate"
                    {...props}
                    value={progress || 0}
                />
            </Container>
            <Container sx={{ minWidth: 35 }}>
                <Typography
                    variant="body2"
                    color="text.secondary"
                >{`${Math.round(progress || 0)}%`}</Typography>
            </Container>
        </Container>
    );
}

function PairControl() {
    const {
        columnPairs,
        setState,
        importedHeaders,
        existingHeaders,
        mergeColumnIndex,
    } = useImporterContext();

    const pairOptions = useMemo(
        () => ({
            existing: existingHeaders,
            imported: importedHeaders,
        }),
        [importedHeaders, existingHeaders]
    );

    const hasOptions =
        !!pairOptions.existing.length && !!pairOptions.imported.length;

    const getOptions = (currentValue: string, headerOrigin: HeaderOrigin) => {
        return pairOptions[headerOrigin].filter(
            ({ value }) =>
                currentValue === value ||
                !columnPairs.map((pair) => pair[headerOrigin]).includes(value)
        );
    };

    const setPairValue = (
        value: string,
        headerOrigin: HeaderOrigin,
        pairIndex: number
    ) => {
        const nextPairs = [...columnPairs];

        nextPairs[pairIndex] = {
            ...nextPairs[pairIndex],
            [headerOrigin]: value,
        };

        setState({ columnPairs: nextPairs });
    };

    const columnPairsWithEmpty = (): Pair[] => {
        // adds a row for each saved pair and an empty row id there are enough options to select from
        const lastPair = columnPairs[columnPairs.length - 1];

        if (
            columnPairs.length < pairOptions.imported.length &&
            (!lastPair || lastPair.existing || lastPair.imported)
        ) {
            return [...columnPairs, DEFAULT_PAIR_STATE];
        }

        return columnPairs;
    };

    const handleMergeClick = (pairIndex: number) => () => {
        setState({
            mergeColumnIndex: mergeColumnIndex === pairIndex ? -1 : pairIndex,
        });
    };

    const validPairs = columnPairs.filter(
        ({ existing, imported }) => existing && imported
    ).length;

    return (
        <Box component="div" sx={{ display: 'flex', flexDirection: 'column' }}>
            {hasOptions && (
                <>
                    <Grid container rowSpacing={1} columnSpacing={1}>
                        {/* Row - 1 */}
                        <Grid item xs={validPairs > 1 ? 5 : 6}>
                            <FormLabel>Imported Column</FormLabel>
                        </Grid>
                        <Grid item xs={validPairs > 1 ? 5 : 6}>
                            <FormLabel>Table Column</FormLabel>
                        </Grid>
                        {validPairs > 1 && (
                            <Grid item xs={2}>
                                <FormLabel>Merge On</FormLabel>
                            </Grid>
                        )}
                        {/* Row - 2 */}
                        {columnPairsWithEmpty().map((pair, pairIndex) => (
                            <Fragment key={pairIndex}>
                                {headerOrigins.map((headerOrigin) => (
                                    <Grid
                                        item
                                        xs={validPairs > 1 ? 5 : 6}
                                        key={`${headerOrigin}-select-${pairIndex}`}
                                    >
                                        <FormControl
                                            size="small"
                                            sx={{ width: '100%' }}
                                        >
                                            <Select
                                                id={`${headerOrigin}-select`}
                                                value={pair[headerOrigin] || ''}
                                                onChange={(event) => {
                                                    setPairValue(
                                                        event.target.value.toString(),
                                                        headerOrigin,
                                                        pairIndex
                                                    );
                                                }}
                                                name={`${headerOrigin}-select`}
                                            >
                                                <MenuItem value="">
                                                    &nbsp;
                                                </MenuItem>
                                                {getOptions(
                                                    pair[headerOrigin],
                                                    headerOrigin
                                                ).map(({ label, value }) => (
                                                    <MenuItem
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                ))}
                                {validPairs > 1 && (
                                    <Grid item xs={2} display="flex">
                                        <Radio
                                            disabled={
                                                !pair.imported || !pair.existing
                                            }
                                            checked={
                                                pairIndex === mergeColumnIndex
                                            }
                                            onClick={handleMergeClick(
                                                pairIndex
                                            )}
                                        />
                                    </Grid>
                                )}
                            </Fragment>
                        ))}
                    </Grid>
                </>
            )}

            <Typography
                variant="subtitle1"
                sx={{ marginTop: 2 }}
                color="GrayText"
            >
                {validPairs ? (
                    <>
                        Imported data from{' '}
                        <Typography
                            fontWeight="bold"
                            component="span"
                            variant="body1"
                        >
                            {validPairs}
                            {validPairs > 1 ? ' columns ' : ' column '}
                        </Typography>
                        will be{' '}
                        {mergeColumnIndex > -1 && (
                            <>
                                merged if{' '}
                                <Typography
                                    fontWeight="bold"
                                    component="span"
                                    variant="body1"
                                >
                                    {columnPairs[mergeColumnIndex].existing}
                                </Typography>{' '}
                                column values match or{' '}
                            </>
                        )}
                        added as new rows
                    </>
                ) : (
                    <>
                        Select columns to determine where the imported data
                        should be added and if the data should be merged on that
                        column.
                    </>
                )}
            </Typography>
        </Box>
    );
}

export default function Importer<TData>({
    rowData,
    api,
}: {
    rowData: TData[];
    api: GridApi<TData> | undefined;
}) {
    const [importedData, setImportedData] = useState<Partial<TData>[] | null>(
        null
    );

    const [report, setReport] = useState<ImportReport<TData>>({
        rowsToAdd: [],
        rowsToMerge: [],
    });

    const [state, setStateComplete] = useState<State>(DEFAULT_STATE);

    if (!api) return <></>;

    const existingHeaders: { label: string; value: string }[] = [];
    (api?.getColumnDefs() || []).forEach(
        ({
            field,
            headerName,
            hidden,
        }: {
            field: string;
            headerName?: string;
            hidden?: boolean;
        }) => {
            const value = field || headerName;
            const label = headerName || field + (hidden ? ' (hidden)' : '');
            if (value && label) existingHeaders.push({ value, label });
        }
    );

    const setState = (update: Partial<typeof state>) =>
        setStateComplete((prev) => ({ ...prev, ...update }));

    const handleFileStr = (fileStr: string) => {
        const { data, headers } = csvParse<TData>(fileStr);

        setImportedData(data);

        setState({
            status: 'pairing',
            progress: null,
            importedHeaders: headers.map((value) => ({ label: value, value })),
        });
    };

    const handleFileUpload = (file: File | undefined) => {
        if (!file || importedData) {
            return;
        }

        setImportedData(null);
        setState({ status: 'progress', dialogOpen: true });

        const fileSizeMb = Math.round(file.size / 1024 / 1024);

        if (fileSizeMb > 261) {
            setState({ status: 'fileSizeError', dialogOpen: true, fileSizeMb });
            return;
        }

        readFileToString(
            file,
            (progress) => setState({ progress }),
            handleFileStr
        );
    };

    const handleClose = () => {
        setImportedData(null);
        setStateComplete(DEFAULT_STATE);
    };

    const handleMerge = () => {
        setState({ status: 'progress' });

        const rowsToAdd: ImportReport<TData>['rowsToAdd'] = [];
        const rowsToMerge: ImportReport<TData>['rowsToMerge'] = [];

        const mergePair = state.columnPairs[state.mergeColumnIndex];

        const getExistingRowIndex = (importedRow: Partial<TData>) => {
            if (!mergePair) return -1;

            return rowData.findIndex(
                (existingRow) =>
                    existingRow[mergePair.existing] ===
                    importedRow[mergePair.imported]
            );
        };

        importedData?.forEach((row) => {
            const existingIndex = getExistingRowIndex(row);

            if (existingIndex === -1) {
                rowsToAdd.push(row as TData);
            } else {
                rowsToMerge.push({ row, existingIndex });
            }
        });

        setReport({ rowsToAdd, rowsToMerge });
        setState({ status: 'report' });
    };

    const { columnPairs, dialogOpen, fileSizeMb, status, progress } = state;

    const handleContinue = () => {
        if (status === 'progress') return;
        if (status === 'pairing') {
            setState({
                columnPairs: columnPairs.filter(
                    ({ existing, imported }) => existing && imported
                ),
            });
            handleMerge();
        }
        if (status === 'report') {
            const { rowsToAdd, rowsToMerge } = report;

            rowsToMerge.forEach(({ existingIndex, row }) => {
                const rowNode = api?.getDisplayedRowAtIndex(existingIndex);

                rowNode?.setData({
                    ...rowData[existingIndex],
                    ...row,
                });
            });

            api?.applyTransaction({
                add: rowsToAdd,
            });

            handleClose();
        }
    };

    const handleReset = () => {
        setState({ status: 'pairing', columnPairs: [] });
    };

    return (
        <>
            <Button
                variant="contained"
                component="label"
                // Used for testing without actually importing
                //
                // onClick={(event) => {
                //     event.stopPropagation();
                //     event.preventDefault();

                //     window
                //         .fetch('/names-descriptions.csv')
                //         .then((response) => response.text())
                //         .then((text) => {
                //             setState({ dialogOpen: true });
                //             handleFileStr(text);
                //         });
                // }}
            >
                Import
                <input
                    type="file"
                    hidden
                    accept=".csv"
                    multiple={false}
                    value={''}
                    onChange={(event) => {
                        handleFileUpload(event.target.files?.[0]);
                    }}
                />
            </Button>
            <Dialog open={dialogOpen} onClose={handleClose} fullWidth>
                <DialogTitle>Preparing Import</DialogTitle>
                <DialogContent>
                    <ImporterContext.Provider
                        value={{ ...state, setState, existingHeaders }}
                    >
                        {status === 'fileSizeError' && (
                            <Typography
                                variant="subtitle1"
                                sx={{ color: 'error.main' }}
                            >
                                File size ({fileSizeMb} MB) is too large.
                            </Typography>
                        )}
                        {status === 'progress' &&
                            (progress ? (
                                <Progress />
                            ) : (
                                <CircularProgress
                                    sx={{
                                        display: 'block',
                                        margin: 'auto',
                                    }}
                                />
                            ))}
                        {status === 'pairing' && <PairControl />}
                        {status === 'report' && <Report {...report} />}
                    </ImporterContext.Provider>
                </DialogContent>
                <DialogActions
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                    }}
                >
                    <Button autoFocus onClick={handleClose}>
                        Cancel
                    </Button>
                    {status !== 'fileSizeError' && status !== 'progress' && (
                        <>
                            <Button
                                onClick={handleReset}
                                disabled={!columnPairs.length}
                                variant="outlined"
                            >
                                Reset
                            </Button>
                            <Button
                                onClick={handleContinue}
                                disabled={
                                    !columnPairs.some(
                                        ({ existing, imported }) =>
                                            existing && imported
                                    )
                                }
                                variant="contained"
                            >
                                Continue
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </>
    );
}
