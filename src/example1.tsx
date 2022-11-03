import { useEffect, useRef, useState } from 'react';
import { AgGridReact, AgGridReactProps } from 'ag-grid-react';
import Importer from './importer';
import { ValueFormatterParams } from 'ag-grid-community';
import csvParse from './csv-parse';

const valueFormatterNum = (params: ValueFormatterParams) =>
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    params.data[params.colDef.field!]?.toLocaleString();

const columnDefs: AgGridReactProps['columnDefs'] = [
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

export default function Example1() {
    const [rowData, setRowData] = useState<Record<string, unknown>[]>([]);

    const gridRef = useRef<AgGridReact<Record<string, unknown>> | null>(null);

    const loadData = (input: 'parks-init.csv') => {
        window
            .fetch(input)
            .then((response) => response.text())
            .then((text) => {
                const { data } = csvParse<Record<string, unknown>>(text);
                setRowData(data);
            });
    };

    useEffect(() => {
        loadData('parks-init.csv');
    }, []);

    return (
        <div className="info">
            <h3>Example 1</h3>

            <p>
                This example demonstrates merging data from a csv file to the
                grid using a visible "Name" column.
            </p>

            <div className="table-controls">
                <Importer rowData={rowData} api={gridRef.current?.api} />
                <a href="parks-descriptions.csv">parks-descriptions.csv</a>
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
