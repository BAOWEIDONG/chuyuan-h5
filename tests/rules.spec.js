import { describe, it, expect } from 'vitest'
import { addWorkHours, workHoursBetween, ymd } from '../src/rules/time.js'
import { checkHospital, checkStay, checkTravelDate, allowedTravelDates, checkPassengers, checkLieFlat, estimateDistance, tripTypeOf } from '../src/rules/eligibility.js'
import { createToken, verifyToken } from '../src/rules/session.js'
import { canTransition } from '../src/rules/status.js'
import { ALL_CITIES, isCityCovered } from '../src/data/cities.js'
import { HOSPITALS } from '../src/data/hospitals.js'

describe('服务手册关键口径', () => {
  it('331 个城市，且成立市辖区覆盖判断', () => {
    expect(ALL_CITIES.length).toBe(331)
    expect(isCityCovered('合肥')).toBe(true)
    expect(isCityCovered('巢湖')).toBe(false) // 县级市不在覆盖范围
  })

  it('12 / 24 工作小时顺延到工作日', () => {
    // 2026-10-23 是周五，20:00 加 12 工作小时 → 周一 20:00
    expect(addWorkHours(new Date('2026-10-23T20:00:00'), 12).getDay()).toBe(1)
    expect(workHoursBetween(new Date('2026-10-23T09:00:00'), new Date('2026-10-26T09:00:00'))).toBe(12)
  })

  it('医院：一级医院、非公立医院被拦截', () => {
    expect(checkHospital({ name: 'A', city: '合肥', level: '三级甲等', nature: '公立' })).toBe(null)
    expect(checkHospital({ name: 'B', city: '合肥', level: '一级', nature: '公立' }).code).toBe('R01')
    expect(checkHospital({ name: 'C', city: '合肥', level: '三级甲等', nature: '民营' }).code).toBe('R01')
    expect(checkHospital({ name: 'D', city: '巢湖', level: '三级甲等', nature: '公立' }).code).toBe('R02')
  })

  it('住院满 2 个自然日，当日出入院被拦截', () => {
    expect(checkStay('2026-10-20', '2026-10-20').length).toBe(1)
    expect(checkStay('2026-10-19', '2026-10-20').length).toBe(0)
  })

  it('出行日期仅限出院当天及之后 2 个自然日', () => {
    const dates = allowedTravelDates('2026-10-20').map(ymd)
    expect(dates).toEqual(['2026-10-20', '2026-10-21', '2026-10-22'])
    expect(checkTravelDate('2026-10-20', '2026-10-23').code).toBe('R04')
  })

  it('短途 6 人、长途 2 人上限；平躺需医嘱', () => {
    expect(checkPassengers('short', 6)).toBe(null)
    expect(checkPassengers('short', 7)).toBeTruthy()
    expect(checkPassengers('long', 3)).toBeTruthy()
    expect(checkLieFlat('lieflat', false).code).toBe('R09')
    expect(checkLieFlat('lieflat', true)).toBe(null)
  })

  it('200 公里分界：合肥—南京短途，合肥—北京长途', () => {
    expect(tripTypeOf(estimateDistance('合肥', '南京'))).toBe('short')
    expect(tripTypeOf(estimateDistance('合肥', '北京'))).toBe('long')
  })

  it('所有医院数据都带省份/城市/区县，能参与城市校验', () => {
    const bad = HOSPITALS.filter(h => !h.city || !h.province || !h.district)
    expect(bad.length).toBe(0)
    expect(HOSPITALS.length).toBeGreaterThan(1900)
  })

  it('登录签名：正常通过，改一个字符即失败', async () => {
    const t = await createToken({ memberId: 'M1', exp: Date.now() + 60000 })
    expect((await verifyToken(t)).ok).toBe(true)
    const tampered = t.slice(0, -2) + (t.slice(-2) === 'aa' ? 'bb' : 'aa')
    const r = await verifyToken(tampered)
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('篡改')
  })

  it('状态机不允许跳级', () => {
    expect(canTransition('REVIEWING', 'CONFIRMED')).toBe(false)
    expect(canTransition('REVIEWING', 'DISPATCHING')).toBe(true)
    expect(canTransition('COMPLETED', 'ON_THE_WAY')).toBe(false)
  })
})
