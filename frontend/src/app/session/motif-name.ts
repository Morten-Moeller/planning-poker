export function motifName(motif: number): string {
  switch (motif) {
    case 1:
      return $localize`:@@motif.dots:Punkte`;
    case 2:
      return $localize`:@@motif.lines:Zeilen`;
    case 3:
      return $localize`:@@motif.rings:Ringe`;
    case 4:
      return $localize`:@@motif.steps:Stufen`;
    default:
      return $localize`:@@motif.grid:Raster`;
  }
}
