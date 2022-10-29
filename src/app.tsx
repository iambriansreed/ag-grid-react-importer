import { useEffect, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import Importer from './importer';
import { ValueFormatterParams } from 'ag-grid-community';
import csvParse from './csv-parse';

const valueFormatterNum = (params: ValueFormatterParams) =>
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    params.data[params.colDef.field!]?.toLocaleString();

const columnDefs = [
    {
        field: 'name',
        sortable: true,
        width: 250,
    },
    {
        field: 'description',
        cellEditor: 'agLargeTextCellEditor',
        cellEditorPopup: true,
        cellEditorParams: {
            maxLength: 100,
            rows: 10,
            cols: 50,
        },
    },
    {
        field: 'location',
    },
    {
        field: 'visitors',
        headerName: 'Annual Visitors',
        sortable: true,
        valueFormatter: valueFormatterNum,
        width: 175,
    },
    {
        field: 'area',
        headerName: 'Area (sq. mi)',
        sortable: true,
        valueFormatter: valueFormatterNum,
        width: 150,
    },
    { field: 'url' },
];

const importerHeaders = columnDefs.reduce(
    (defs, { field, headerName }: { field: string; headerName?: string }) => ({
        ...defs,
        [field]: headerName || field,
    }),
    {} as Record<string, string>
);

function App() {
    const [rowData, setRowData] = useState<Record<string, unknown>[]>([]);

    const loadData = (input: 'starter.csv') => {
        window
            .fetch(input)
            .then((response) => response.text())
            .then((text) => {
                const { data } = csvParse<Record<string, unknown>>(text);
                setRowData(data);
            });
    };

    useEffect(() => {
        loadData('starter.csv');
    }, []);

    const gridRef = useRef<AgGridReact<Record<string, unknown>> | null>(null);

    return (
        <>
            <div className="info">
                <h1>Importer for AG Grid</h1>
                <p>
                    Allows users to import csv files to update existing rows or
                    add rows.
                </p>
                <hr style={{ borderColor: '#666', margin: '2rem 0' }} />
            </div>

            <div className="info">
                <h2>Example 1</h2>
                <p>
                    This example demonstrates merging data from a csv file to
                    the grid. <br />
                    This csv file (
                    <a href="/names-descriptions.csv">
                        names-descriptions.csv
                    </a>{' '}
                    ) has a matching name column so the imported data can be
                    merged.
                </p>

                <div className="table-controls">
                    <Importer
                        existingData={rowData}
                        existingHeaders={importerHeaders}
                        onImport={({ rowsToAdd, rowsToMerge }) => {
                            rowsToMerge.forEach(({ existingIndex, row }) => {
                                const rowNode =
                                    gridRef.current?.api.getDisplayedRowAtIndex(
                                        existingIndex
                                    );

                                rowNode?.setData({
                                    ...rowData[existingIndex],
                                    ...row,
                                });
                            });

                            gridRef.current?.api.applyTransaction({
                                add: rowsToAdd,
                            });
                        }}
                    />
                </div>
                <div>
                    <div className="ag-theme-material ag-grid-container">
                        <AgGridReact
                            ref={gridRef}
                            rowData={rowData}
                            columnDefs={columnDefs}
                            defaultColDef={{
                                editable: true,
                                filter: 'agTextColumnFilter',
                            }}
                        ></AgGridReact>
                    </div>
                </div>
            </div>
        </>
    );
}

export default App;
