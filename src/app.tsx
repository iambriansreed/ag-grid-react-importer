import { useEffect, useRef, useState } from 'react';
import { AgGridReact, AgReactUiProps } from 'ag-grid-react';
import Importer from './importer';
import { GridApi, ValueFormatterParams } from 'ag-grid-community';
import { csvParse, toTitleCase } from './util';

const valueFormatterNum = (params: ValueFormatterParams) =>
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    params.data[params.colDef.field!].toLocaleString();

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
        [field]: headerName || toTitleCase(field),
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
            <div className="table-controls">
                <Importer
                    existingData={rowData}
                    existingHeaders={importerHeaders}
                    onImport={({ rowsToAdd, rowsToMerge, mergePair }) => {
                        rowsToMerge.forEach((rowToMerge) => {
                            const rowIndex = rowData.findIndex(
                                (row) =>
                                    row[mergePair.existing] ===
                                    rowToMerge[mergePair.imported]
                            );

                            const rowNode =
                                gridRef.current?.api.getDisplayedRowAtIndex(
                                    rowIndex
                                );

                            Object.entries(rowToMerge).forEach(
                                ([field, value]) => {
                                    rowNode?.setDataValue(field, value);
                                }
                            );
                        });

                        gridRef.current?.api.applyTransaction({
                            add: rowsToAdd,
                        });
                    }}
                />
                <a href="/names-descriptions.csv">names-descriptions.csv</a>
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
        </>
    );
}

export default App;