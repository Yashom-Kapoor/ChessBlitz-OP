export function secondsToHMS(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const paddedMinutes = minutes.toString().padStart(2, '0');
    const paddedSeconds = secs.toString().padStart(2, '0');

    return hours > 0
        ? `${hours}:${paddedMinutes}:${paddedSeconds}`
        : `${paddedMinutes}:${paddedSeconds}`;
}