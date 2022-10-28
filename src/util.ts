// TODO: replace with something more robust
export function csvParse<Row>(csv: string) {
    const [headers, ...lines] = csvToArray(csv);

    return {
        headers,
        data: lines.map((l) =>
            l.reduce(
                (r, v, i) => ({ ...r, [headers[i]]: v }),
                {} as Record<string, unknown>
            )
        ) as Row[],
    };
}

function csvToArray(text: string) {
    let p = '',
        row = [''],
        // eslint-disable-next-line prefer-const
        ret = [row],
        i = 0,
        r = 0,
        s = !0;
    for (let l of text.split('')) {
        if ('"' === l) {
            if (s && l === p) row[i] += l;
            s = !s;
        } else if (',' === l && s) l = row[++i] = '';
        else if ('\n' === l && s) {
            if ('\r' === p) row[i] = row[i].slice(0, -1);
            row = ret[++r] = [(l = '')];
            i = 0;
        } else row[i] += l;
        p = l;
    }
    return ret;
}

export function toTitleCase(str: string) {
    str = str.replace(/_/g, ' ');
    return str.charAt(0).toUpperCase() + str.slice(1);
}
