import { useEffect, useRef, useState } from 'react';
import { AgGridReact, AgGridReactProps } from 'ag-grid-react';
import Importer from './importer';
import { ValueFormatterParams } from 'ag-grid-community';
import csvParse from './csv-parse';

const valueFormatterNum = (params: ValueFormatterParams) =>
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    params.data[params.colDef.field!]?.toLocaleString();

const gradeColumn = (
    field: string
): NonNullable<AgGridReactProps['columnDefs']>[0] => {
    return {
        field,
        headerName: field
            .replace(/-/g, ' ')
            .replace(/^\w/, (c) => c.toUpperCase())
            .replace('Cw', 'CW'),
        sortable: true,
        valueFormatter: valueFormatterNum,
        width: 120,
    };
};

const columnDefs: AgGridReactProps['columnDefs'] = [
    {
        field: 'id',
        hide: true,
    },
    {
        field: 'name',
        headerName: 'Name',
        sortable: true,
        width: 250,
    },
    { ...gradeColumn('cw-1a') },
    { ...gradeColumn('cw-1b') },
    { ...gradeColumn('cw-1c') },
    { ...gradeColumn('quiz-1') },
    { ...gradeColumn('test-1') },
];

export default function Example1() {
    const [rowData, setRowData] = useState<Record<string, unknown>[]>([]);

    const gridRef = useRef<AgGridReact<Record<string, unknown>> | null>(null);

    const loadData = (input: 'grades-init.csv') => {
        window
            .fetch(input)
            .then((response) => response.text())
            .then((text) => {
                const { data } = csvParse<Record<string, unknown>>(text);
                setRowData(data);
            });
    };

    useEffect(() => {
        loadData('grades-init.csv');
    }, []);

    return (
        <div className="info">
            <h3>Example 2</h3>

            <p>
                This example demonstrates merging data from a csv file to the
                grid using a hidden "ID" column.
            </p>

            <div className="table-controls">
                <Importer
                    rowData={rowData}
                    columnDefs={columnDefs}
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
                <a href="grades-quiz-test-1.csv">grades-quiz-test-1.csv</a>
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
    );
}
