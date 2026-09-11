const {
  structuredMedicinesFromVisit,
  structuredMedicinesToFlat,
} = require('./prescriptionMessages');

/** Prescribed lines for pharmacy / confirm: prescription array, then selectedMedicines, else SOAP plan. */
function medicinesForVisit(visit) {
  return structuredMedicinesToFlat(structuredMedicinesFromVisit(visit));
}

module.exports = { medicinesForVisit, structuredMedicinesFromVisit };
