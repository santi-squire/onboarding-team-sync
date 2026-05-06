# Read-Along Script · Weekly Sync 2026-05-06

Texto detallado para leer / parafrasear durante la presentación. Cada sección incluye **lo que decís** y **lo que significa cada análisis** en plain English. ~13 min total.

---

## Slide 1 · Cover

**Read:**
> "Buenas. Onboarding Team Sync, semana del 6 de mayo. Yo lo guío hoy. La idea es darles results del experimento de login que shippeamos hace una semana y alinearnos en los próximos pasos."

---

## Slide 2 · TL;DR

**Read:**
> "Eric, vos preguntaste hace dos días si teníamos resultados. La respuesta es sí. Cuatro findings, en este orden:"

**Then read each highlight aloud:**

> "Uno — Flow B catchea su target population. 33.5% de los usuarios que tipean su email en Flow B tienen una cuenta de barbero invitada (temp_password). Sin Flow B, esos usuarios probablemente habrían creado cuentas duplicadas."

> "Dos — Flow B convierte mejor que Flow A. Login completion 67.5% vs 58.7%. El email-first no rompe login — lo mejora."

> "Tres — Per device, Flow B tiene MÁS signups por la ruta de signup que Flow A. 14.3% vs 9.1%. Si el experimento estuviera redirigiendo barberos invitados al login como queremos, este número debería bajar en B, no subir. Lo seguimos investigando."

> "Cuatro — hay un Sample Ratio Mismatch real. Esperábamos 50/50, observamos 63/37. No invalida el findings de arriba pero limita cuánto podemos comparar absolute counts."

> "El resto del deck es el detalle."

**Internal note**: si Eric quiere ir directo a discussion, podés saltarte la mitad del deck y volver a Commitments / Courses. El TL;DR carga la presentación.

---

## Slide 3 · Hito (context)

**Read:**
> "Antes de meternos en data, contexto. La squad de Onboarding se formó hace 50 días. Empezamos a desarrollar este experimento hace 30 días. Hoy estamos en 50% de rollout, mañana 100%. Esto es un experimento dentro de Squire de cómo se comporta una squad chica con foco. Este primer ship es la prueba de concepto del modelo de equipo."

> "Para que sirva como benchmark: shippeamos a 2 plataformas en paralelo, con 9 events idénticos byte-for-byte entre iOS y Android. Una sola query de Snowflake cubre los dos."

---

## Slide 4 · Per-exposure — el wrinkle

**What this slide actually shows:**
Counts barber-type accounts created via the signup path in each variant:
- **Flow A path**: user taps "Sign up" link in the dismissible login sheet → signup form
- **Flow B path**: user types an email that doesn't exist in our DB → auto-redirected to signup

Then we normalize by total devices in each variant (per-exposure rate).

**Read:**
> "Acá está el primer matiz. Si miramos counts crudos — 38 en Flow A, 35 en Flow B — parecen similares. Pero por device, Flow A tiene 9.1%, Flow B tiene 14.3%. Eso es un 57% más alto en Flow B."

> "**Importante**: no podemos afirmar que sean accidentales sin user research. Podrían ser barberos legit que no tienen cuenta, o podrían ser barberos invitados que se equivocaron. Lo que sí podemos decir: si el experimento está funcionando como esperamos — sea, redirigiendo barberos invitados al login — este número debería BAJAR en Flow B, no subir."

> "Lo presentamos para no esconder algo que va en dirección contraria a la hipótesis. Caveats: muestra chica, ramp por debajo del 50% la mayoría del período. No estamos declarando un winner."

**If Eric asks "how do you know they were accidental?"**:
> "No lo sabemos con certeza. Lo único que medimos es: usuarios que llegaron al signup form. Cualquiera de ellos pudo haber tenido la intención de crear cuenta nueva (= legit) o no haber sabido que tenía cuenta (= accidental). El experimento se diseñó asumiendo que la mayoría de barbers en Squire son invited, no nuevos. Si esa suposición es válida, este number debería bajar con flow B. Si no baja, o no hay tantos accidentales como creíamos, o flow B no está catcheando el problema mejor que A."

---

## Slide 5 · Funnel — good news (also the guardrail metric)

**What this slide actually shows:**
The login funnel: how many distinct devices made it through each step (assigned → welcome viewed → login succeeded). Conversion rate at the end.

This IS the **`overall_login_success_rate` guardrail** Tristan and yo committeamos en el Confluence Analytics Plan — y vino limpio.

**Read:**
> "Otra cara. Flow B tiene welcome rate del 99.6%, vs 85.6% en Flow A. Eso significa que casi todos los usuarios asignados a Flow B llegaron al welcome screen — el sheet de email-first funciona. En Flow A, el 14% de usuarios asignados al variant nunca vieron el welcome — algún drop pre-pantalla."

> "Conversion rate (succeeded ÷ welcome): 67.5% en Flow B, 58.7% en Flow A. Diferencia de 9 percentage points. El email-first no rompe login — lo mejora."

> "Esta métrica derivada es exactamente el guardrail de `overall_login_success_rate` que Tristan y yo definimos en el Confluence plan. Estaba pensada para detectar si una de las flows rompía login para usuarios reales. Resultado: ninguna lo rompe; B lo mejora."

**If Eric asks "why is welcome rate higher in B?"**:
> "El sheet de Flow B aparece automáticamente después del landing screen — no hay paso de 'tap to login' como en Flow A. Menos fricción → más usuarios que llegan."

---

## Slide 6 · Email check — the money signal

**What this slide actually shows:**
Cuando un usuario tipea su email en Flow B, la API responde una de tres cosas:
- `returning`: ya tiene cuenta y password (login normal)
- `temp_password`: tiene cuenta creada por shop owner, sin password aún (= invited barber, lo que queremos catchear)
- `new_user`: no existe el email (genuine signup intent)

Esta slide muestra la distribución.

**Read:**
> "Y acá está el por qué de Flow B. De los usuarios que entran un email en Flow B, 33.5% son temp_password — barberos invitados que tienen cuenta creada por su shop owner pero todavía no setearon password."

> "Esa es exactamente la población que el experimento existe para catchear. Sin Flow B, ese 33.5% probablemente habría tocado 'Sign up' por equivocación y creado cuenta duplicada. En Flow A no podemos detectar esto a este nivel — el flow no expone el routing decision."

> "El resto: 43.7% returning (login normal), 14.1% new_user (genuine signup), 9% legacy username inputs (barbers viejos sin email)."

**Para vos (interno):** este es el slide más quotable. Es la razón por la que Flow B tiene sentido conceptualmente.

---

## Slide 7 · Variant balance — la honestidad

**What this slide actually shows:**
LD assigns 50/50, but Snowflake observes 63/37. SRM = Sample Ratio Mismatch — when actual deviates from expected. Explainer card en el slide define el término.

**Read:**
> "Honestidad: hay un Sample Ratio Mismatch real. LD nos asigna 50/50, pero en Snowflake — la fuente de verdad según Yurii — vemos 63/37. 13 percentage points off."

> "Por qué importa: las comparaciones absolutas (counts crudos) están sesgadas. Por eso miramos rates per-device en lugar de totals. Las conclusiones cualitativas (Flow B converts better, Flow B catches temp_password) no se invalidan, pero nos atajamos."

> "Investigación en flight con Tristan. Sospechosos: bucketing logic en LD, exposures cacheados de pre-experiment, evaluación no-uniforme."

---

## Slide 8 · Friction — guardrails

**Read:**
> "Friction signals son comparables entre variants. Lo nuevo: Flow B tiene 57 events de abandono en el step de email — un step que Flow A no tiene. Es esperable; vale la pena watch para ver si crece."

> "Forgot password: similar magnitude. Login_failed solo aparece en Flow B en estos numbers — eso es un caveat de data quality que está en la próxima slide."

---

## Slide 9 · North star — instrumentation gap, NOT null result

**What this slide actually shows:**
North star = `account_created` con `account_type='indie'` AND `came_from='signup_link'`, segmentado por variant. Esto es lo que Tristan y yo committeamos como métrica primaria. **Resultado: 0 en ambos variants en 7 días.**

Pero el cero NO significa "el experimento falló" — significa que la métrica no se puede leer todavía.

**Read:**
> "El north star primario — indie signups via signup_link — está en cero en ambos variants. **Esto NO es un null result.** Es un instrumentation gap probable: el property `account_type='indie'` puede no estar emitiendo correctamente en el momento de creación de cuenta indie. QA validates next week."

> "Mientras tanto usamos como proxy 'barber-type signups' que vimos antes. La distribución por path es: Flow A — 38 via signup_link. Flow B — 35 via email_not_found. Misma magnitud, paths distintos. Volumen muy chico para callar el norte star real."

**If Eric asks "is the query wrong, or are barbers missing?"**:
> "La query es correcta. El cero significa que CERO eventos `account_created` en estos 7 días tienen `account_type='indie'`. Tres causas posibles, que vamos a desambiguar con una query esta semana:
> - Bug de instrumentación (más probable): la property no se prende en la creation path de indie
> - Volumen real bajo durante el ramp (posible, raro)
> - El filtro de variant excluye indie signups (poco probable pero verificable)"

---

## Slide 10 · Caveats

**Read:**
> "Cuatro caveats que estamos triajando esta semana. Las leo rápido."

> "Uno — la property `account_type='indie'` puede no estar emitiendo. Por eso el north star está en cero. QA validates next week."

> "Dos — login_attempt_failed muestra cero rows en Flow A. Sospechoso. Probablemente versiones viejas de la app emiten el event legacy 'login_failed' sin la property variant, así que se filtran. Cross-check next pull."

> "Tres — el SRM de 63/37. Investigación con Tristan."

> "Cuatro — hubo un scope leak en signup_link_tapped: 5 events de 3 devices iOS aparecieron en Flow B cuando deberían ser solo Flow A. Patrón: mismo device, 1-2 minutos apart. El botón 'Join for free' de Flow B comparte firing site con el 'Sign up' de Flow A. Falta variant guard — fix de código iOS-only, ya identified."

---

## Slide 11 · Retrospective

**Read:**
> "Cómo se sintió shippear este experimento. 30 días desde decision-to-ship. 50 días desde que se formó el equipo. 2 plataformas, 9 events con parity total."

**For "What went well", read each title + 1 line of detail.**

**For "What slowed us down", DON'T read it as a list of complaints — frame each one with its Learning. Each slowdown teaches us something for the next project. Read the LEARNING line out loud.**

> "Por ejemplo: la migración concurrente de feature flags (LD → PostHog → GrowthBook) generó overhead de wiring. Learning: lockear el destino de analytics antes de instrumentar."

---

## Slide 12 · Courses — next chapter

**What this slide is about:**
Courses es el next major project que el squad va a atacar. Tristan ya lo kickeó pre-experiment, está en el Figma de "Soooooo Onboarding". El plan: prototypear con Claude Design + DESIGN.md spec, iterar uno a uno, coordinar con el RN launch.

**Read:**
> "El próximo capítulo. Courses: el segundo de los 6 buckets que Tristan trazó para Onboarding cuando se formó la squad. Ya kickeado pre-experiment, paused durante las vacaciones de Tristan, resuming esta semana."

> "El plan: tomar el Figma que Tristan ya tiene, pasarlo por Claude Design + DESIGN.md spec — herramientas que Anthropic y la comunidad open source publicaron en abril. Iteramos un curso a la vez, validamos con el equipo, codeamos. Coordinamos timing con el launch del RN app."

> "Esto es lo que viene en commitments en el próximo slide."

---

## Slide 13 · Commitments

**Read:**
> "Tres decisiones que estamos tomando — chequeables si están de acuerdo, o pueden pushback. El resto está in flight."

**For each decision, read the text and click the checkbox visually.**

> "Una — phased Courses prototyping con Tristan. Empezamos próxima semana. Si hay algo que conflictua, es el momento."

> "Dos — buildear los flows A y B de login en la nueva RN app, en paralelo con el equipo de Appointments. Empezamos en 2 semanas. Cuando decidamos un winner del experimento, RN ya está listo para shipping."

> "Tres — esto sí necesito clarity de Eric/Yurii: el RN launch es el 29 de mayo. ¿Es full feature parity o onboarding-only first? Eso afecta el alcance de los Courses para esa fecha."

> "Los 4 items en flight son status — investigación SRM con Tristan, ship del fix del scope leak, validation de QA del indie property, weekly analytics extraction."

---

## Slide 14 · Close

**Read:**
> "Eso es todo. Discusión, preguntas, o pushback?"

---

## Things to know about each metric (cheat sheet)

| Metric | What it really measures | Where the number comes from |
|---|---|---|
| **33.5% temp_password** | Of users who typed an email in Flow B and the API responded — what % had an unset-password account | `EMAIL_CHECK_RESULT` table, `result='temp_password'` rows / total Flow B rows |
| **63/37 SRM** | Of distinct devices that fired LOGIN_EXPERIMENT_ASSIGNED, what % was each variant | Snowflake `LOGIN_EXPERIMENT_ASSIGNED` distinct ANONYMOUS_ID by VARIANT |
| **9.1% / 14.3% per-exposure** | Of distinct devices in each variant, what % created a barber-type account via the signup path | numerator: `ACCOUNT_CREATED` filter (account_type=barber, came_from in [signup_link, email_not_found]), denominator: variant balance distinct devices |
| **58.7% / 67.5% conversion** | login_succeeded ÷ welcome_screen_viewed per variant | Funnel query — distinct ANONYMOUS_ID at each step |
| **0 indie north star** | account_created with account_type='indie' AND came_from='signup_link' | Same north star query as plan, returned no rows in 7 days |

---

## Coverage check vs Confluence Analytics Plan

All 9 events + the derived guardrail are in the deck:

| Plan event | In which slide |
|---|---|
| login_experiment_assigned | Slide 7 (Variant balance) |
| welcome_screen_viewed | Slide 5 (Funnel — step 2) |
| email_check_result | Slide 6 (Email check) |
| login_succeeded | Slide 5 (Funnel — step 3) |
| account_created | Slide 9 (North star) |
| login_failed | Slide 8 (Friction) + Slide 10 (asymmetry caveat) |
| forgot_password_tapped | Slide 8 (Friction) |
| signup_link_tapped | Slide 10 (scope leak caveat with diagnosis) |
| login_abandoned | Slide 8 (Friction · iOS only) |
| **overall_login_success_rate** (guardrail) | Slide 5 (Funnel — labeled in eyebrow + currentRead) |

---

## Pre-experiment baseline comparison — for next week

**Tristan's plan**: "no in-experiment control group; comparison vs the current login flow is done via before/after analysis at the reporting layer."

We haven't pulled this yet. Worth doing for next sync:

```sql
-- Pre-experiment baseline: legacy login funnel for the 7 days BEFORE the deploy
SELECT
  'pre' as bucket,
  COUNT(DISTINCT ANONYMOUS_ID) as visitors,
  -- build legacy funnel from SIGNUP_LANDING_SCREEN_VIEWED → SIGNIN_BUTTON_TAPPED → LOGIN_SUCCESSFUL
  ...
FROM RAW.RUDDER_EVENTS.SIGNUP_LANDING_SCREEN_VIEWED
WHERE TIMESTAMP BETWEEN '2026-04-23' AND '2026-04-30'
```

(I'll prepare this pre-meet next sync.)
