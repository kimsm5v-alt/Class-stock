/**
 * 매수율 연동 배율 계산
 * 핵심: "다 같이 맞추면 보상↑" / 비핵심: "다 같이 속으면 손실↑"
 */

export function getCoreMultiplier(buyRatePercent: number): number {
  if (buyRatePercent >= 80) return 4
  if (buyRatePercent >= 60) return 3
  if (buyRatePercent >= 40) return 2.5
  return 2
}

export function getNonCoreMultiplier(buyRatePercent: number): number {
  if (buyRatePercent >= 80) return 0.3
  if (buyRatePercent >= 60) return 0.4
  if (buyRatePercent >= 40) return 0.5
  return 0.7
}

export function getMultiplier(isCore: boolean, buyRatePercent: number): number {
  return isCore ? getCoreMultiplier(buyRatePercent) : getNonCoreMultiplier(buyRatePercent)
}

/** 배율을 사람이 읽기 좋은 텍스트로 */
export function getMultiplierLabel(isCore: boolean, multiplier: number): string {
  if (isCore) return `×${multiplier} 폭등`
  return `×${multiplier} 하락`
}
