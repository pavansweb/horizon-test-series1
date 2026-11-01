#!/usr/bin/env python3
import os
import subprocess
import json
import uuid
from datetime import datetime

# Define 90 realistic JEE Main questions and their correct options
QUESTIONS = []

# --- PHYSICS (Q1 to Q30) ---
physics_data = [
    ("A particle moves in a straight line with uniform acceleration. If it covers 20 m in the 2nd second and 30 m in the 4th second, its initial velocity is:", ["5 m/s", "10 m/s", "15 m/s", "2.5 m/s"], "A"),
    ("A ball is thrown vertically upwards with velocity u. The distance covered during the last t seconds of its ascent is:", ["ut", "0.5 g t^2", "u t - 0.5 g t^2", "g t^2"], "B"),
    ("A body of mass 2 kg moving with velocity 3 m/s collides head-on with a body of mass 1 kg moving with velocity 4 m/s in opposite direction. If e = 0.5, velocity of 2 kg body after collision is:", ["0.5 m/s", "1 m/s", "-0.33 m/s", "2 m/s"], "C"),
    ("The moment of inertia of a solid cylinder of mass M, radius R and length L about its longitudinal axis is:", ["0.5 M R^2", "0.25 M R^2 + M L^2 / 12", "M R^2", "0.4 M R^2"], "A"),
    ("The escape velocity from the surface of the earth is 11.2 km/s. If a planet has double the radius and double the mean density of earth, the escape velocity will be:", ["22.4 km/s", "11.2 km/s", "44.8 km/s", "15.8 km/s"], "A"),
    ("A body executing SHM has amplitude 0.05 m and frequency 100 Hz. The maximum acceleration of the body is:", ["100 pi^2 m/s^2", "2000 pi^2 m/s^2", "200 pi^2 m/s^2", "4000 pi^2 m/s^2"], "B"),
    ("Two simple harmonic motions are represented by y1 = 5 sin(2*pi*t + pi/3) and y2 = 5*(sin(2*pi*t) + sqrt(3)*cos(2*pi*t)). The ratio of their amplitudes is:", ["1 : 2", "1 : 1", "2 : 1", "1 : 4"], "A"),
    ("An ideal gas expands isothermally from volume V to 2V. The work done by the gas is W1. If it expands adiabatically from V to 2V, work done is W2. Then:", ["W1 = W2", "W1 > W2", "W1 < W2", "Cannot be determined"], "B"),
    ("The root mean square speed of the molecules of a gas at absolute temperature T is proportional to:", ["T", "sqrt(T)", "T^2", "1/sqrt(T)"], "B"),
    ("A Carnot engine has an efficiency of 40% when its sink is at 27 deg C. The temperature of the source is:", ["500 K", "450 K", "600 K", "550 K"], "A"),
    ("Two point charges +4q and +q are placed 30 cm apart. At what point on the line joining them is the net electric field zero?", ["20 cm from +4q", "10 cm from +4q", "15 cm from +4q", "25 cm from +4q"], "A"),
    ("The capacitance of a parallel plate capacitor with air medium is 6 uF. With the introduction of a dielectric medium between the plates, capacitance becomes 30 uF. The permittivity of the medium is (in C^2/(N m^2)):", ["5", "4.42 x 10^-11", "8.85 x 10^-12", "0.44 x 10^-10"], "B"),
    ("A copper wire of resistance R is stretched uniformly such that its length increases by 10%. Its new resistance is approximately:", ["1.1 R", "1.21 R", "1.05 R", "1.44 R"], "B"),
    ("In a potentiometer wire of length 10 m and resistance 20 ohm is connected in series with a battery of 5 V and 480 ohm resistor. The potential gradient along the wire is:", ["0.02 V/m", "0.05 V/m", "0.1 V/m", "0.2 V/m"], "A"),
    ("A proton and an alpha particle enter a uniform magnetic field with equal kinetic energies perpendicular to the field lines. The ratio of radii of their circular paths (r_p / r_alpha) is:", ["1 : 1", "1 : 2", "2 : 1", "1 : 4"], "A"),
    ("A circular coil of 50 turns and radius 10 cm carries a current of 2 A. The magnetic dipole moment of the coil is:", ["3.14 A m^2", "0.314 A m^2", "6.28 A m^2", "1.57 A m^2"], "A"),
    ("A magnetic needle suspended horizontally is free to swing in horizontal plane. It makes 30 vibrations per minute at a place where dip is 30 deg and 40 vibrations per minute where dip is 60 deg. The ratio of horizontal fields is:", ["9 : 16", "16 : 9", "3 : 4", "4 : 3"], "A"),
    ("An inductor of inductance 2 mH is connected across a source of alternating current of 220 V, 50 Hz. The inductive reactance is:", ["0.628 ohm", "6.28 ohm", "62.8 ohm", "0.0628 ohm"], "A"),
    ("The self-inductance of a solenoid having 500 turns and length 1 m with area of cross-section 10 cm^2 is:", ["0.314 mH", "3.14 mH", "0.0314 mH", "31.4 mH"], "A"),
    ("In an electromagnetic wave in free space, the root mean square value of the electric field is 6 V/m. The peak value of the magnetic field is:", ["2.83 x 10^-8 T", "1.41 x 10^-8 T", "4.24 x 10^-8 T", "0.7 x 10^-8 T"], "A"),
    ("A convex lens of focal length 20 cm in air is immersed in water (refractive index 4/3). If refractive index of glass is 1.5, its focal length in water becomes:", ["80 cm", "40 cm", "20 cm", "10 cm"], "A"),
    ("In Young's double slit experiment, if the separation between the slits is halved and the distance between the slits and the screen is doubled, the fringe width becomes:", ["Unchanged", "Doubled", "Four times", "Halved"], "C"),
    ("The de Broglie wavelength of an electron accelerated through a potential difference of 100 V is:", ["1.227 Angstrom", "0.1227 Angstrom", "12.27 Angstrom", "0.01227 Angstrom"], "A"),
    ("The threshold wavelength for photoelectric emission from a metal is 500 nm. When light of wavelength 400 nm falls on it, the maximum kinetic energy of photoelectrons emitted is:", ["0.62 eV", "1.24 eV", "3.1 eV", "2.48 eV"], "A"),
    ("According to Bohr's model of hydrogen atom, the radius of the nth orbit is directly proportional to:", ["n", "n^2", "1/n", "1/n^2"], "B"),
    ("The half-life of a radioactive isotope is 10 days. The fraction of the sample remaining undecayed after 30 days is:", ["1/8", "1/4", "1/16", "1/3"], "A"),
    ("In a p-n junction diode under reverse bias condition, the thickness of depletion layer:", ["Increases", "Decreases", "Remains constant", "First decreases then increases"], "A"),
    ("The output Y of a two-input NAND gate is 0 only when:", ["Both inputs are 0", "Both inputs are 1", "One input is 0 and other is 1", "Any one input is 0"], "B"),
    ("A wire of length L and cross-sectional area A is made of material of Young's modulus Y. If the wire is stretched by an amount x, the work done is:", ["Y A x^2 / (2 L)", "Y A x / L", "Y A x^2 / L", "0.5 Y A x / L"], "A"),
    ("A small spherical ball of radius r falls from rest in a viscous liquid. The terminal velocity acquired by the ball is proportional to:", ["r", "r^2", "r^3", "1/r"], "B")
]

# --- CHEMISTRY (Q31 to Q60) ---
chemistry_data = [
    ("The number of moles of hydrogen molecules required to produce 20 moles of ammonia through Haber's process is:", ["10", "20", "30", "40"], "C"),
    ("The orbital angular momentum of an electron in a 3p orbital is:", ["h / (2 pi)", "sqrt(2) h / (2 pi)", "sqrt(6) h / (2 pi)", "0"], "B"),
    ("Which of the following molecules has zero dipole moment?", ["NF3", "BF3", "ClF3", "PCl3"], "B"),
    ("According to Molecular Orbital Theory, which of the following species is diamagnetic?", ["O2", "B2", "C2", "N2+"], "C"),
    ("The work done during the reversible isothermal expansion of 1 mole of an ideal gas at 300 K from 1 L to 10 L is approximately (R = 8.314 J/(mol K)):", ["-5.74 kJ", "-2.30 kJ", "-11.48 kJ", "-1.44 kJ"], "A"),
    ("For the reaction N2(g) + 3H2(g) <=> 2NH3(g), the relationship between Kp and Kc is:", ["Kp = Kc (RT)^-2", "Kp = Kc (RT)^2", "Kp = Kc (RT)", "Kp = Kc"], "A"),
    ("The pH of a 10^-8 M aqueous solution of HCl at 25 deg C is:", ["8.0", "7.0", "Between 6 and 7", "Between 7 and 8"], "C"),
    ("The molar conductivity of a 0.05 M solution of an electrolyte is 120 S cm^2 mol^-1. Its degree of dissociation (given limiting molar conductivity = 400 S cm^2 mol^-1) is:", ["0.30", "0.15", "0.60", "0.45"], "A"),
    ("For a first order reaction, the time required for 99% completion is related to half life (t_1/2) by:", ["t_99% = 2 t_1/2", "t_99% = 6.64 t_1/2", "t_99% = 10 t_1/2", "t_99% = 3.32 t_1/2"], "B"),
    ("Which of the following colloids is a gel?", ["Butter", "Milk", "Smoke", "Paint"], "A"),
    ("Which of the following alkali metal ions has the highest hydration enthalpy?", ["Li+", "Na+", "K+", "Cs+"], "A"),
    ("The correct order of increasing electron gain enthalpy with negative sign for halogens is:", ["I < Br < F < Cl", "I < Br < Cl < F", "Cl < F < Br < I", "F < Cl < Br < I"], "A"),
    ("Boric acid (H3BO3) in aqueous solution acts as:", ["A monobasic Lewis acid", "A tribasic Lewis acid", "A monobasic Bronsted acid", "A dibasic Bronsted acid"], "A"),
    ("The hybridisation of carbon in diamond, graphite and C60 fullerene respectively are:", ["sp3, sp2, sp2", "sp3, sp3, sp2", "sp2, sp3, sp2", "sp3, sp2, sp3"], "A"),
    ("Which of the following transition metal ions has the highest magnetic moment in spin-only state?", ["Fe3+", "Cr3+", "Ni2+", "Cu2+"], "A"),
    ("The geometry and hybridisation of [Ni(CN)4]2- are respectively:", ["Square planar, dsp2", "Tetrahedral, sp3", "Square planar, sp3", "Tetrahedral, dsp2"], "A"),
    ("Which complex shows linkage isomerism?", ["[Co(NH3)5(NO2)]Cl2", "[Co(NH3)6]Cl3", "[Pt(NH3)2Cl2]", "[Co(en)3]Cl3"], "A"),
    ("The correct IUPAC name of the compound CH3-CH(OH)-CH2-COOH is:", ["3-hydroxybutanoic acid", "2-hydroxybutanoic acid", "4-hydroxybutan-2-one", "beta-hydroxybutyric acid"], "A"),
    ("Which of the following carbocations is the most stable?", ["(CH3)3C+", "(CH3)2CH+", "CH3CH2+", "CH3+"], "A"),
    ("In the chlorination of methane in the presence of sunlight, the chain termination step is:", ["Cl* + Cl* -> Cl2", "CH4 + Cl* -> CH3* + HCl", "Cl2 -> 2 Cl*", "CH3* + Cl2 -> CH3Cl + Cl*"], "A"),
    ("When propene reacts with HBr in presence of benzoyl peroxide, the major product formed is:", ["1-bromopropane", "2-bromopropane", "1,2-dibromopropane", "2,2-dibromopropane"], "A"),
    ("Which reagent is used in the Reimer-Tiemann reaction of phenol?", ["CHCl3 + aq. NaOH", "CCl4 + aq. NaOH", "CO2 + aq. NaOH", "CH3Cl + AlCl3"], "A"),
    ("The conversion of benzaldehyde to cinnamic acid by reacting with acetic anhydride in the presence of sodium acetate is known as:", ["Perkin reaction", "Cannizzaro reaction", "Aldol condensation", "Clemmensen reduction"], "A"),
    ("Which of the following compounds gives a positive iodoform test?", ["Pentan-2-one", "Pentan-3-one", "Benzaldehyde", "Methanol"], "A"),
    ("Hoffmann bromamide degradation of acetamide gives:", ["Methylamine", "Ethylamine", "Aniline", "Dimethylamine"], "A"),
    ("Carbylamine test is positive for:", ["Primary amines", "Secondary amines", "Tertiary amines", "Quaternary salts"], "A"),
    ("Which of the following vitamins is water-soluble?", ["Vitamin C", "Vitamin A", "Vitamin D", "Vitamin K"], "A"),
    ("The building blocks of proteins are:", ["alpha-amino acids", "beta-amino acids", "Nucleotides", "Fatty acids"], "A"),
    ("Nylon-6,6 is a polymer obtained by the condensation of hexamethylenediamine with:", ["Adipic acid", "Terephthalic acid", "Succinic acid", "Sebacic acid"], "A"),
    ("Aspirin is chemically known as:", ["Acetylsalicylic acid", "Methyl salicylate", "Phenyl salicylate", "Salicylamide"], "A")
]

# --- MATHEMATICS (Q61 to Q90) ---
maths_data = [
    ("If f(x) = (x - 1) / (x + 1), then f(f(x)) is equal to:", ["-1/x", "1/x", "x", "-x"], "A"),
    ("The domain of the function f(x) = sqrt(log_10((5x - x^2) / 4)) is:", ["[1, 4]", "(0, 5)", "[0, 5]", "(1, 4)"], "A"),
    ("If alpha and beta are the roots of the equation x^2 - 6x + 2 = 0, then the value of alpha^10 - 2*alpha^8 / (2*alpha^9) is:", ["3", "6", "2", "1"], "A"),
    ("If the sum of the first n terms of an AP is 3n^2 + 5n, then its 15th term is:", ["92", "88", "94", "90"], "A"),
    ("The value of the limit as x -> 0 of (sin(x) - x) / x^3 is:", ["-1/6", "1/6", "-1/3", "0"], "A"),
    ("The function f(x) = x^3 - 3x^2 + 3x - 1 is:", ["Strictly increasing for all x in R", "Strictly decreasing for all x in R", "Increasing for x > 1 and decreasing for x < 1", "Neither increasing nor decreasing"], "A"),
    ("The maximum value of the function f(x) = sin(x) + cos(x) on [0, pi/2] is:", ["sqrt(2)", "2", "1", "sqrt(3)"], "A"),
    ("The value of the definite integral from 0 to pi/2 of sin^2(x) dx is:", ["pi/4", "pi/2", "pi/8", "1"], "A"),
    ("The area bounded by the curve y^2 = 4x and the line x = 3 is:", ["8*sqrt(3)", "4*sqrt(3)", "16*sqrt(3)", "12"], "A"),
    ("The solution of the differential equation dy/dx + y*cot(x) = 2*cos(x) is:", ["y*sin(x) = sin^2(x) + C", "y*cos(x) = cos^2(x) + C", "y*sin(x) = cos^2(x) + C", "y = 2*sin(x) + C"], "A"),
    ("The distance between the parallel lines 3x + 4y = 9 and 6x + 8y = 15 is:", ["3/10", "3/5", "6/5", "9/10"], "A"),
    ("The equation of the circle passing through the points (0, 0), (a, 0) and (0, b) is:", ["x^2 + y^2 - ax - by = 0", "x^2 + y^2 + ax + by = 0", "x^2 + y^2 - 2ax - 2by = 0", "x^2 + y^2 + 2ax + 2by = 0"], "A"),
    ("The eccentricity of the ellipse 9x^2 + 25y^2 = 225 is:", ["4/5", "3/5", "16/25", "2/5"], "A"),
    ("The length of the latus rectum of the parabola y^2 = -12x is:", ["12", "6", "3", "24"], "A"),
    ("The angle between the lines whose direction ratios are (1, 1, 2) and (sqrt(3)-1, -sqrt(3)-1, 4) is:", ["pi/3", "pi/4", "pi/6", "pi/2"], "A"),
    ("The shortest distance between the skew lines r = a1 + lambda*b1 and r = a2 + mu*b2 is zero if:", ["(a2 - a1) . (b1 x b2) = 0", "b1 . b2 = 0", "(a2 - a1) x (b1 x b2) = 0", "b1 x b2 = 0"], "A"),
    ("If a vector a has magnitude 3, vector b has magnitude 4, and |a + b| = 5, then the angle between a and b is:", ["pi/2", "pi/3", "pi/4", "0"], "A"),
    ("If the vectors 2i - j + k, i + 2j - 3k and 3i + lambda*j + 5k are coplanar, then lambda is equal to:", ["-4", "4", "2", "-2"], "A"),
    ("A pair of fair dice is rolled. The probability of getting a sum of 8 given that both numbers are even is:", ["1/9", "1/3", "1/4", "5/36"], "B"),
    ("If P(A) = 0.4, P(B) = 0.8 and P(B|A) = 0.6, then P(A union B) is:", ["0.96", "0.84", "0.72", "0.64"], "A"),
    ("The number of 4-digit numbers that can be formed using the digits 1, 2, 3, 4, 5 without repetition is:", ["120", "24", "60", "240"], "A"),
    ("The coefficient of x^5 in the expansion of (1 + x)^10 is:", ["252", "210", "120", "45"], "A"),
    ("If |z - 4/z| = 2, then the maximum value of |z| is:", ["sqrt(5) + 1", "sqrt(5) - 1", "2", "sqrt(5)"], "A"),
    ("The value of (1 + i)^8 + (1 - i)^8 is:", ["32", "16", "64", "0"], "A"),
    ("The system of equations x + y + z = 6, x + 2y + 3z = 10, x + 2y + lambda*z = mu has infinitely many solutions if:", ["lambda = 3, mu = 10", "lambda != 3, mu = 10", "lambda = 3, mu != 10", "lambda != 3, mu != 10"], "A"),
    ("If A is an invertible matrix of order 3 and |A| = 4, then |adj(A)| is equal to:", ["16", "64", "4", "12"], "A"),
    ("The principal value of sin^-1(sin(2*pi/3)) is:", ["pi/3", "2*pi/3", "-pi/3", "5*pi/3"], "A"),
    ("The number of real solutions of the equation cos(x) = |x| is:", ["2", "1", "0", "Infinite"], "A"),
    ("The mean of 5 observations is 4.4 and their variance is 8.24. If three of the observations are 1, 2, and 6, then the other two are:", ["4 and 9", "3 and 8", "2 and 7", "5 and 8"], "A"),
    ("The contrapositive of the statement 'If it rains, then the match will be cancelled' is:", ["If the match is not cancelled, then it does not rain", "If it does not rain, then the match is not cancelled", "If the match is cancelled, then it rains", "It rains and the match is not cancelled"], "A")
]

all_items = []
q_counter = 1

answer_key = {}

for q, opts, correct in physics_data:
    all_items.append((q_counter, "PHYSICS", q, opts, correct))
    answer_key[q_counter] = correct
    q_counter += 1

for q, opts, correct in chemistry_data:
    all_items.append((q_counter, "CHEMISTRY", q, opts, correct))
    answer_key[q_counter] = correct
    q_counter += 1

for q, opts, correct in maths_data:
    all_items.append((q_counter, "MATHEMATICS", q, opts, correct))
    answer_key[q_counter] = correct
    q_counter += 1

# Generate Groff source
groff_content = """\\\" Groff ms source for JEE Main Mock Paper
.nr PS 10
.nr VS 13
.TL
JEE (MAIN) EXAMINATION - 2026
.AU
National Testing Agency (NTA) - Mock Examination
.AI
Paper 1: B.E. / B.Tech  |  Duration: 3 Hours  |  Max Marks: 300
.PP
.B "IMPORTANT INSTRUCTIONS:"
.IP "1." 3
The question paper consists of three sections: Physics (Q.1 to Q.30), Chemistry (Q.31 to Q.60), and Mathematics (Q.61 to Q.90).
.IP "2." 3
Each question has four options (A), (B), (C), and (D). Exactly one option is correct.
.IP "3." 3
Marking Scheme: \\fB+4\\fR marks for each correct answer, \\fB-1\\fR mark for each incorrect answer, and \\fB0\\fR marks for unattempted questions.
.sp 1
"""

current_subject = ""
for qnum, subj, text, opts, correct in all_items:
    if subj != current_subject:
        current_subject = subj
        groff_content += f"""
.bp
.SH
SECTION: {current_subject} (Questions {qnum} to {qnum + 29})
.sp 0.5
"""
    groff_content += f"""
.PP
.B "Q{qnum}."
{text}
.IP "(A)" 4
{opts[0]}
.IP "(B)" 4
{opts[1]}
.IP "(C)" 4
{opts[2]}
.IP "(D)" 4
{opts[3]}
.sp 0.5
"""

groff_file = "/tmp/jee_sample.groff"
with open(groff_file, "w") as f:
    f.write(groff_content)

# Compile to PDF using groff -ms -Tpdf
output_pdf = "/home/zen/Projects/jee-mock-portal/public/uploads/jee_main_2026_sample_paper_1.pdf"
subprocess.run(f"groff -ms -Tpdf {groff_file} > {output_pdf}", shell=True, check=True)
print(f"Generated PDF at: {output_pdf}")

# Seed Test in data/tests.json
now = datetime.now().isoformat()
sample_test = {
    "id": "jee-2026-sample-01",
    "title": "JEE (Main) 2026 Full Syllabus Mock Test - Paper 1",
    "duration": 180,
    "totalMarks": 300,
    "pdfUrl": "/uploads/jee_main_2026_sample_paper_1.pdf",
    "pdfFileName": "jee_main_2026_sample_paper_1.pdf",
    "subjects": [
        {
            "id": "physics",
            "name": "Physics",
            "startQuestion": 1,
            "endQuestion": 30,
            "totalQuestions": 30
        },
        {
            "id": "chemistry",
            "name": "Chemistry",
            "startQuestion": 31,
            "endQuestion": 60,
            "totalQuestions": 30
        },
        {
            "id": "mathematics",
            "name": "Mathematics",
            "startQuestion": 61,
            "endQuestion": 90,
            "totalQuestions": 30
        }
    ],
    "markingScheme": {
        "correct": 4,
        "incorrect": -1,
        "unattempted": 0
    },
    "answerKey": answer_key,
    "status": "published",
    "createdAt": now,
    "updatedAt": now
}

db_file = "/home/zen/Projects/jee-mock-portal/data/tests.json"
tests_data = [sample_test]
with open(db_file, "w") as f:
    json.dump(tests_data, f, indent=2)

print(f"Seeded sample test in {db_file}")
