export default function getEquidistantSinePoints(amplitude: number, frequency: number, numPoints: number, width: number, height: number) {
    // 1. Oversample the curve to approximate its shape accurately
    const oversampleRate = 10; // More samples for better accuracy
    const totalSamples = numPoints * oversampleRate;
    const rawPoints = [];
    for (let i = 0; i < totalSamples; i++) {
        const x = (i / (totalSamples - 1)) * width;
        // Scale the raw sine value to the desired amplitude and vertical position
        const y = height / 2 - amplitude * Math.sin((x / width) * 2 * Math.PI * frequency);
        rawPoints.push({ x, y });
    }

    // 2. Calculate cumulative arc lengths between raw points
    const arcLengths = [0];
    let cumulativeLength = 0;
    for (let i = 1; i < rawPoints.length; i++) {
        const dx = rawPoints[i].x - rawPoints[i - 1].x;
        const dy = rawPoints[i].y - rawPoints[i - 1].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        cumulativeLength += distance;
        arcLengths.push(cumulativeLength);
    }
    const totalLength = cumulativeLength;
    const distanceStep = totalLength / (numPoints - 1);

    // 3. Interpolate to find points at the exact equal distances
    const equidistantPoints = [];
    for (let i = 0; i < numPoints; i++) {
        const targetLength = i * distanceStep;
        // Find the segment in rawPoints that contains the targetLength
        let j = 0;
        while (j < arcLengths.length && arcLengths[j] < targetLength) {
            j++;
        }

        if (j === 0) j = 1; // Handle the start point

        const startPoint = rawPoints[j - 1];
        const endPoint = rawPoints[j];
        const startLength = arcLengths[j - 1];
        const endLength = arcLengths[j];

        // Linear interpolation parameter (0 to 1) within the segment
        const segmentRatio = (targetLength - startLength) / (endLength - startLength);

        // Interpolate coordinates
        const x = startPoint.x + segmentRatio * (endPoint.x - startPoint.x);
        const y = startPoint.y + segmentRatio * (endPoint.y - startPoint.y);

        equidistantPoints.push({ x, y });
    }

    return equidistantPoints;
};