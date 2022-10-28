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
    RadioGroup,
    Radio,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useEffect, useMemo, useState } from 'react';
import { csvParse, toTitleCase } from './util';

const headerTypes = ['imported', 'existing'] as const;
const DEFAULT_STATE: Pair = { existing: '', imported: '' };
type HeaderType = typeof headerTypes[number];
type Pair = Record<HeaderType, string>;

export default function Importer<TData>({
    existingData,
    existingHeaders,
    onImport,
}: {
    existingData: TData[];
    existingHeaders: Record<string, string>;
    onImport: (report: {
        rowsToMerge: Partial<TData>[];
        rowsToAdd: TData[];
        mergePair: Pair;
    }) => void;
}) {
    const [imported, setImported] = useState<{
        fileSizeMb?: number;
        data?: Partial<TData>[];
        headers?: Record<string, string>;
    } | null>(null);

    const [status, setStatus] = useState<
        'fileSizeError' | 'progress' | 'pairing' | 'merging' | 'report'
    >('progress');

    const [headerPairs, setHeaderPairs] = useState<Pair[]>([]);

    const [mergePair, setMergePair] = useState<number>(-1);

    const [progress, setProgress] = useState<number | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);

    const handleFileStr = (fileStr: string) => {
        const { data, headers: headerData } = csvParse<TData>(fileStr);

        setImported({
            data,
            headers: headerData.reduce(
                (agg, field) => ({ ...agg, [field]: toTitleCase(field) }),
                {} as Record<string, string>
            ),
        });

        setProgress(null);
        setStatus('pairing');
    };

    const handleFileUpload = (file: File | undefined) => {
        if (!file || imported?.data) {
            return;
        }

        setImported(null);
        setStatus('progress');
        setDialogOpen(true);

        const fileSizeMb = Math.round(file.size / 1024 / 1024);

        if (fileSizeMb > 261) {
            setImported({ fileSizeMb });
            setStatus('fileSizeError');
            return;
        }

        setStatus('progress');

        const reader = new FileReader();

        reader.addEventListener('load', (event) => {
            if (event.target?.result)
                handleFileStr(event.target.result.toString());
        });

        reader.addEventListener('progress', (event) => {
            if (event.loaded && event.total) {
                const percent = (event.loaded / event.total) * 100;
                setProgress(percent);
            }
        });

        reader.readAsText(file);
    };

    const handleClose = () => {
        setImported(null);
        setDialogOpen(false);
    };

    const [report, setReport] = useState({
        rowsToMerge: [] as Partial<TData>[],
        rowsToAdd: [] as TData[],
    });

    const handleMerge = () => {
        setStatus('progress');

        const rowsToAdd: TData[] = [];
        const rowsToMerge: Partial<TData>[] = [];

        if (mergePair > -1) {
            const mergeHeader = headerPairs[mergePair];

            imported?.data?.forEach((row) => {
                const valueToMatch = row[mergeHeader.imported];

                const existingRowIndex = existingData.findIndex(
                    (existingRow) =>
                        existingRow[mergeHeader.existing] === valueToMatch
                );

                if (existingRowIndex === -1) {
                    rowsToAdd.push(row as TData);
                    return;
                }

                rowsToMerge.push(row);
            });
        }

        setReport({ rowsToAdd, rowsToMerge });
        setStatus('report');
    };

    const handleContinue = () => {
        if (status === 'progress') return;
        if (status === 'pairing') setStatus('merging');
        if (status === 'merging') handleMerge();
        if (status === 'report') {
            onImport({
                ...report,
                mergePair: headerPairs[mergePair],
            });
            handleClose();
        }
    };

    const headers = {
        existing: existingHeaders,
        imported: imported?.headers || {},
    };

    return (
        <>
            <Button
                variant="contained"
                component="label"
                onClick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();

                    window
                        .fetch('/names-descriptions.csv')
                        .then((response) => response.text())
                        .then((text) => {
                            setDialogOpen(true);
                            handleFileStr(text);
                        });
                }}
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
            <Dialog open={dialogOpen} onClose={handleClose}>
                <DialogTitle>Preparing Import</DialogTitle>
                <DialogContent>
                    <>
                        {status === 'fileSizeError' && (
                            <Typography
                                variant="subtitle1"
                                sx={{ color: 'error.main' }}
                            >
                                File size ({imported?.fileSizeMb} MB) is too
                                large.
                            </Typography>
                        )}
                        {status === 'progress' &&
                            (progress ? (
                                <Progress value={progress} />
                            ) : (
                                <CircularProgress />
                            ))}
                        {status === 'pairing' && (
                            <PairControl
                                headers={headers}
                                pairs={headerPairs}
                                setPairs={setHeaderPairs}
                            />
                        )}
                        {status === 'merging' && (
                            <MergeControl
                                pairs={headerPairs}
                                headers={headers}
                                mergePair={mergePair}
                                setMergePair={setMergePair}
                            />
                        )}
                        {status === 'report' && (
                            <Report
                                merged={report.rowsToMerge.length}
                                added={report.rowsToAdd.length}
                            />
                        )}
                    </>
                </DialogContent>
                <DialogActions
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                    }}
                >
                    <Button
                        autoFocus
                        onClick={handleClose}
                        sx={{
                            marginLeft:
                                status !== 'fileSizeError' ? '' : 'auto',
                        }}
                    >
                        Cancel
                    </Button>
                    {!!headerPairs.length && status === 'pairing' && (
                        <Button
                            onClick={() => setHeaderPairs([])}
                            variant="outlined"
                        >
                            Clear Pairs
                        </Button>
                    )}
                    {status !== 'fileSizeError' && (
                        <Button
                            variant={
                                status === 'report' ? 'contained' : 'outlined'
                            }
                            disabled={
                                status === 'progress' || !headerPairs.length
                            }
                            onClick={handleContinue}
                        >
                            {status === 'progress' && <></>}
                            {status === 'pairing' && <>Continue</>}
                            {status === 'merging' && <>Continue</>}
                            {status === 'report' && <>Import</>}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </>
    );
}

function Report({ merged, added }: { merged: number; added: number }) {
    return (
        <>
            <Typography variant="subtitle1">
                {merged} rows will be updated.
            </Typography>
            <Typography variant="subtitle1">
                {added} rows will be added.
            </Typography>
        </>
    );
}

function MergeControl({
    pairs,
    mergePair,
    setMergePair,
    headers,
}: {
    pairs: Pair[];
    mergePair: number;
    setMergePair: (pairIndex: number) => void;
    headers: Record<HeaderType, Record<string, string>>;
}) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1">
                Update rows when values match in columns:
            </Typography>
            <FormControl>
                <Select
                    id="merge-select"
                    value={mergePair}
                    onChange={(event) => {
                        setMergePair(event.target.value as number);
                    }}
                    renderValue={(value) => {
                        const column = pairs[value];
                        return (
                            pairs[value] && (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                    }}
                                    key={column.existing}
                                >
                                    {headers.existing[column.existing]}
                                    <ArrowForwardIcon
                                        sx={{
                                            verticalAlign: 'bottom',
                                        }}
                                    />
                                    {headers.imported[column.imported]}
                                </Box>
                            )
                        );
                    }}
                >
                    {pairs.map((column, index) => (
                        <MenuItem
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                            }}
                            key={column.existing}
                            value={index}
                        >
                            {headers.existing[column.existing]}
                            <ArrowForwardIcon
                                sx={{
                                    verticalAlign: 'bottom',
                                }}
                            />
                            {headers.imported[column.imported]}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
}

function Progress(props: LinearProgressProps & { value: number }) {
    return (
        <Container sx={{ display: 'flex', alignItems: 'center' }}>
            <Container sx={{ width: '100%', mr: 1 }}>
                <LinearProgress
                    variant="determinate"
                    {...props}
                    value={props.value || 0}
                />
            </Container>
            <Container sx={{ minWidth: 35 }}>
                <Typography
                    variant="body2"
                    color="text.secondary"
                >{`${Math.round(props.value)}%`}</Typography>
            </Container>
        </Container>
    );
}

function PairControl({
    headers,
    pairs,
    setPairs,
}: {
    pairs: Pair[];
    headers: Record<HeaderType, Record<string, string>>;
    setPairs: (pairs: Pair[]) => void;
}) {
    const [state, setState] = useState<Pair>(DEFAULT_STATE);
    const [mergePair, setMergePair] = useState<Pair | null>(null);

    const addPair = () => {
        setPairs([...pairs, state]);
        setState(DEFAULT_STATE);
    };

    useEffect(() => {
        setPairs(
            Object.keys(headers.existing)
                .filter((existingKey) => headers.imported[existingKey])
                .map((existing) => ({
                    existing,
                    imported: existing,
                }))
        );
    }, []);

    const headersToOptions = (headerType: HeaderType) =>
        Object.entries(headers[headerType])
            .filter(
                ([key]) => !pairs.map((pair) => pair[headerType]).includes(key)
            )
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => (a.label > b.label ? 1 : -1));

    const pairOptions = useMemo(
        // remaining if not already in a pair
        () => ({
            existing: headersToOptions('existing'),
            imported: headersToOptions('imported'),
        }),
        [pairs]
    );

    const hasOptions =
        !!pairOptions.existing.length && !!pairOptions.imported.length;

    return (
        <Box
            component="div"
            sx={{ display: 'flex', flexDirection: 'column', width: 400 }}
        >
            {hasOptions && (
                <>
                    <Typography variant="subtitle1" sx={{ marginBottom: 1 }}>
                        Select imported columns to merge into existing columns.
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Button
                            disabled={!state.existing || !state.imported}
                            onClick={addPair}
                            variant="contained"
                            sx={{ marginRight: 2, marginTop: 5 }}
                        >
                            Merge
                        </Button>
                        {headerTypes.map((headerType, headerIndex) => (
                            <FormControl
                                key={headerType}
                                sx={{
                                    [headerIndex
                                        ? 'marginLeft'
                                        : 'marginRight']: 1,
                                    width: '50%',
                                }}
                            >
                                <FormLabel id={`${headerType}-label`}>
                                    {toTitleCase(headerType)}
                                </FormLabel>
                                <Select
                                    id={`${headerType}-select`}
                                    value={state[headerType]}
                                    onChange={(event) => {
                                        setState((prev) => ({
                                            ...prev,
                                            [headerType]:
                                                event.target.value.toString(),
                                        }));
                                    }}
                                    name={`${headerType}-select`}
                                >
                                    {pairOptions[headerType].map(
                                        ({ label, value }) => (
                                            <MenuItem key={value} value={value}>
                                                {label}
                                            </MenuItem>
                                        )
                                    )}
                                </Select>
                            </FormControl>
                        ))}
                    </Box>
                </>
            )}
            {!!pairs.length && (
                <>
                    <Typography
                        variant="subtitle1"
                        sx={{
                            fontWeight: 'bold',
                            marginTop: hasOptions ? 2 : 0,
                        }}
                    >
                        Columns to merge
                    </Typography>

                    {pairs.map((pair, index) => {
                        return (
                            <Box
                                key={index}
                                role="listitem"
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    m: '0.5rem 0',
                                }}
                            >
                                <Typography sx={{ width: '50%' }}>
                                    {headers.imported[pair.imported]}
                                </Typography>
                                <ArrowForwardIcon />
                                <Typography
                                    sx={{
                                        width: '50%',
                                        textAlign: 'right',
                                    }}
                                >
                                    {headers.existing[pair.existing]}
                                </Typography>
                            </Box>
                        );
                    })}
                    <Box
                        component="div"
                        role="list"
                        sx={{ marginTop: 0 }}
                    ></Box>
                </>
            )}
        </Box>
    );
}
