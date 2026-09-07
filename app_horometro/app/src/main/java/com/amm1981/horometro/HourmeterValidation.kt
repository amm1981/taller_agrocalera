package com.amm1981.horometro

internal fun readingError(value: String, reference: String?, opening: Boolean, tolerance: String = "0"): String? {
    val number = value.replace(',', '.').toBigDecimalOrNull()
        ?: return "Ingresa un horometro numerico valido."
    if (number.signum() < 0) return "El horometro debe ser mayor o igual a 0."
    val previous = reference?.toBigDecimalOrNull() ?: return null
    if (number < previous) return "No puede ser menor al ultimo horometro valido: $previous."
    val allowed = tolerance.toBigDecimalOrNull()?.max(java.math.BigDecimal.ZERO) ?: java.math.BigDecimal.ZERO
    if (opening && number.subtract(previous).abs() > allowed) {
        return "El inicio debe coincidir con el ultimo horometro valido: $previous. Tolerancia: $allowed."
    }
    return null
}
