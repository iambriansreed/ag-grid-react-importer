export default async function readFileToString(
    file: File,
    onProgress: (percent: number) => void,
    onComplete: (str: string) => void
) {
    if (!file) {
        onComplete('');
        return;
    }

    const reader = new FileReader();

    reader.addEventListener('load', (event) => {
        onComplete(event.target?.result?.toString() || '');
    });

    reader.addEventListener('progress', (event) => {
        if (event.loaded && event.total) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
        }
    });

    reader.readAsText(file);
}
