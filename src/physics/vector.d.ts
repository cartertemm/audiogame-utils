/** Three dimensional coordinates using positive X east, positive Y north, and positive Z up. */
export interface Vector3 {
	/** East or west coordinate. */
	x: number;
	/** North or south coordinate. */
	y: number;
	/** Elevation coordinate. */
	z: number;
}

/** Creates a coordinate vector, defaulting each component to zero. */
export function vector(x?: number, y?: number, z?: number): Vector3;
