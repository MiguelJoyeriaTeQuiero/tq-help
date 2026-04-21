"""
Generador de Guía de Usuario TQ-HELP
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import Flowable
import datetime

OUTPUT = r"C:\Users\itjoy\Desarrollo\TQ-HELP\public\guia-tqhelp.pdf"

# ── Colores ──────────────────────────────────────────────────────────────────
INDIGO     = HexColor("#6366f1")
INDIGO_L   = HexColor("#eef2ff")
INDIGO_D   = HexColor("#4338ca")
SLATE_900  = HexColor("#0f172a")
SLATE_700  = HexColor("#334155")
SLATE_500  = HexColor("#64748b")
SLATE_100  = HexColor("#f1f5f9")
GREEN      = HexColor("#16a34a")
GREEN_L    = HexColor("#dcfce7")
AMBER      = HexColor("#d97706")
AMBER_L    = HexColor("#fef3c7")
RED        = HexColor("#dc2626")
RED_L      = HexColor("#fee2e2")
WHITE      = white

W, H = A4

# ── Estilos ───────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

def S(name, **kw):
    return ParagraphStyle(name, **kw)

cover_title = S("CoverTitle",
    fontSize=36, leading=44, textColor=INDIGO,
    alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=8)

cover_sub = S("CoverSub",
    fontSize=16, leading=22, textColor=SLATE_700,
    alignment=TA_CENTER, fontName="Helvetica", spaceAfter=6)

cover_meta = S("CoverMeta",
    fontSize=11, leading=16, textColor=SLATE_500,
    alignment=TA_CENTER, fontName="Helvetica")

chapter_title = S("ChapterTitle",
    fontSize=22, leading=28, textColor=WHITE,
    fontName="Helvetica-Bold", spaceAfter=0, spaceBefore=0)

section_title = S("SectionTitle",
    fontSize=15, leading=20, textColor=INDIGO_D,
    fontName="Helvetica-Bold", spaceBefore=18, spaceAfter=6)

subsection_title = S("SubSectionTitle",
    fontSize=12, leading=16, textColor=SLATE_900,
    fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=4)

body = S("Body",
    fontSize=10.5, leading=16, textColor=SLATE_700,
    fontName="Helvetica", spaceBefore=3, spaceAfter=3,
    alignment=TA_JUSTIFY)

bullet = S("Bullet",
    fontSize=10.5, leading=16, textColor=SLATE_700,
    fontName="Helvetica", leftIndent=16, spaceBefore=2, spaceAfter=2,
    bulletIndent=4)

bullet2 = S("Bullet2",
    fontSize=10, leading=15, textColor=SLATE_500,
    fontName="Helvetica", leftIndent=32, spaceBefore=1, spaceAfter=1,
    bulletIndent=20)

toc_style = S("TOC",
    fontSize=11, leading=18, textColor=SLATE_700,
    fontName="Helvetica", leftIndent=0)

toc_sub = S("TOCSub",
    fontSize=10, leading=16, textColor=SLATE_500,
    fontName="Helvetica", leftIndent=20)

note_style = S("Note",
    fontSize=10, leading=15, textColor=HexColor("#1e3a8a"),
    fontName="Helvetica", leftIndent=6)

warn_style = S("Warn",
    fontSize=10, leading=15, textColor=HexColor("#92400e"),
    fontName="Helvetica", leftIndent=6)

ok_style = S("Ok",
    fontSize=10, leading=15, textColor=HexColor("#166534"),
    fontName="Helvetica", leftIndent=6)

# ── Helpers ───────────────────────────────────────────────────────────────────
def sp(h=8):
    return Spacer(1, h)

def hr():
    return HRFlowable(width="100%", thickness=1,
                      color=HexColor("#e2e8f0"), spaceAfter=8, spaceBefore=4)

def p(text, style=body):
    return Paragraph(text, style)

def b(text):
    return Paragraph(f"&#8226; {text}", bullet)

def b2(text):
    return Paragraph(f"&#8226; {text}", bullet2)

def nb(text):
    return Paragraph(f"<b>1.</b> {text}", bullet)

def chapter_banner(emoji, title, color=INDIGO):
    """Bloque de cabecera de capítulo con fondo de color."""
    data = [[Paragraph(f"{emoji}  {title}", chapter_title)]]
    t = Table(data, colWidths=[W - 4*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), color),
        ("ROUNDEDCORNERS", [10, 10, 10, 10]),
        ("TOPPADDING",    (0,0), (-1,-1), 14),
        ("BOTTOMPADDING", (0,0), (-1,-1), 14),
        ("LEFTPADDING",   (0,0), (-1,-1), 20),
        ("RIGHTPADDING",  (0,0), (-1,-1), 20),
    ]))
    return t

def tip_box(text, kind="tip"):
    """Caja de consejo/aviso."""
    if kind == "tip":
        bg, border, label = INDIGO_L, INDIGO, "&#128161; Consejo"
        st = note_style
    elif kind == "warn":
        bg, border, label = AMBER_L, AMBER, "&#9888;&#65039; Importante"
        st = warn_style
    else:
        bg, border, label = GREEN_L, GREEN, "&#9989; Recuerda"
        st = ok_style

    inner = [
        [Paragraph(f"<b>{label}</b>", st)],
        [Paragraph(text, st)],
    ]
    t = Table(inner, colWidths=[W - 4*cm - 20])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), bg),
        ("LINEAFTER",     (0,0), (0,-1), 3, border),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("RIGHTPADDING",  (0,0), (-1,-1), 10),
    ]))
    return t

def role_badge(text, color):
    data = [[Paragraph(f"<b>{text}</b>",
        S("rb", fontSize=9, textColor=WHITE, fontName="Helvetica-Bold",
          alignment=TA_CENTER))]]
    t = Table(data, colWidths=[3.5*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), color),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 8),
    ]))
    return t

def twoCol(left_items, right_items):
    """Tabla de dos columnas para listas lado a lado."""
    max_rows = max(len(left_items), len(right_items))
    data = []
    for i in range(max_rows):
        l = left_items[i] if i < len(left_items) else ""
        r = right_items[i] if i < len(right_items) else ""
        data.append([l, r])
    t = Table(data, colWidths=[(W-4*cm)/2 - 6, (W-4*cm)/2 - 6])
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ]))
    return t

# ── Contenido ─────────────────────────────────────────────────────────────────
def build():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
        title="Guia de Usuario TQ-HELP",
        author="TQ-HELP",
        subject="Guia de Usuario v1.0",
    )

    story = []

    # ══════════════════════════════════════════════════════
    # PORTADA
    # ══════════════════════════════════════════════════════
    story += [
        Spacer(1, 3*cm),
        p("&#128142;", S("e", fontSize=72, alignment=TA_CENTER, leading=90)),
        Spacer(1, 0.5*cm),
        p("Guia de Usuario", cover_title),
        p("TQ-HELP", S("t2", fontSize=48, leading=54, textColor=INDIGO_D,
                       alignment=TA_CENTER, fontName="Helvetica-Bold")),
        Spacer(1, 0.4*cm),
        p("Tu asistente de soporte interno", cover_sub),
        Spacer(1, 0.8*cm),
        HRFlowable(width="60%", thickness=2, color=INDIGO,
                   hAlign="CENTER", spaceAfter=14, spaceBefore=4),
        Spacer(1, 0.3*cm),
        p("Version 1.0  &#183;  Abril 2026", cover_meta),
        p("Joyeria Te Quiero  &#183;  Uso interno", cover_meta),
        Spacer(1, 2*cm),
    ]

    # Tabla de roles en portada
    roles_data = [
        [role_badge("&#128100; EMPLEADO", HexColor("#0ea5e9")),
         role_badge("&#128736; ADMIN DEPT.", INDIGO),
         role_badge("&#128274; SUPERADMIN", HexColor("#7c3aed"))],
    ]
    rt = Table(roles_data, colWidths=[4*cm, 4.5*cm, 4.5*cm], hAlign="CENTER")
    rt.setStyle(TableStyle([
        ("ALIGN",  (0,0), (-1,-1), "CENTER"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING",  (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ]))
    story += [rt, PageBreak()]

    # ══════════════════════════════════════════════════════
    # INDICE
    # ══════════════════════════════════════════════════════
    story += [
        chapter_banner("&#128203;", "Indice de contenidos"),
        sp(20),
        p("1. &#10067; Que es TQ-HELP?", toc_style),
        p("2. &#128100; Guia para Empleados", toc_style),
        p("   2.1 Iniciar sesion", toc_sub),
        p("   2.2 Crear una incidencia", toc_sub),
        p("   2.3 Ver mis incidencias", toc_sub),
        p("   2.4 Comentar y chatear", toc_sub),
        p("   2.5 Prioridades y SLA", toc_sub),
        p("   2.6 Valorar el servicio", toc_sub),
        p("   2.7 Peticiones y Roadmap", toc_sub),
        p("   2.8 FAQ", toc_sub),
        p("   2.9 Canal de denuncias", toc_sub),
        p("   2.10 Notificaciones push", toc_sub),
        p("   2.11 Buscador global", toc_sub),
        sp(6),
        p("3. &#128736; Guia para Administradores de Departamento", toc_style),
        p("   3.1 Gestionar incidencias del departamento", toc_sub),
        p("   3.2 Panel admin", toc_sub),
        p("   3.3 Plantillas de tickets", toc_sub),
        p("   3.4 Tickets recurrentes", toc_sub),
        p("   3.5 Gestion de FAQ", toc_sub),
        sp(6),
        p("4. &#128274; Guia para Superadmin", toc_style),
        p("   4.1 Gestion de usuarios", toc_sub),
        p("   4.2 Reglas de negocio", toc_sub),
        p("   4.3 Estado del sistema", toc_sub),
        p("   4.4 Widget embebible", toc_sub),
        p("   4.5 Informes automaticos", toc_sub),
        sp(6),
        p("5. &#9889; Consejos y trucos", toc_style),
        p("6. &#10067; Preguntas frecuentes sobre el sistema", toc_style),
        PageBreak(),
    ]

    # ══════════════════════════════════════════════════════
    # 1. QUE ES TQ-HELP
    # ══════════════════════════════════════════════════════
    story += [
        chapter_banner("&#10067;", "1. Que es TQ-HELP?", HexColor("#0ea5e9")),
        sp(16),
        p("TQ-HELP es como el <b>servicio de atencion al cliente</b>... pero para los empleados de Joyeria Te Quiero. &#128077;"),
        sp(6),
        p("Imagina que un dia llegas al trabajo y tu ordenador no enciende. &#128187; &#10060; Sin TQ-HELP tendrias que buscar al tecnico de IT por toda la oficina, llamar por telefono, mandar un correo y esperar a ver si alguien te hace caso..."),
        sp(6),
        p("<b>Con TQ-HELP es mucho mas facil:</b>"),
        b("Entras a la app desde cualquier navegador &#127758;"),
        b("Escribes lo que te pasa en dos segundos &#9999;&#65039;"),
        b("El sistema lo manda automaticamente a quien tiene que resolverlo &#128226;"),
        b("Tu puedes ver en todo momento que esta pasando con tu problema &#128064;"),
        b("Cuando esta resuelto, te avisan! &#128276;"),
        sp(12),
        tip_box("TQ-HELP funciona en el movil, la tablet y el ordenador. Puedes usarlo desde cualquier sitio.", "ok"),
        sp(14),
        p("""<b>Para que sirve cada seccion?</b>""", subsection_title),
    ]

    modulos = [
        ("&#127998; Incidencias", "Cuando algo no funciona (el ordenador, la impresora, el email...)"),
        ("&#128161; Peticiones", "Cuando tienes una idea para mejorar algo en la empresa"),
        ("&#128506; Roadmap", "Ver que mejoras estan planeadas y en que estado estan"),
        ("&#10067; FAQ", "Respuestas a las preguntas mas comunes"),
        ("&#128737;&#65039; Canal de Denuncias", "Para reportar algo grave de forma anonima"),
        ("&#128276; Notificaciones", "Avisos cuando cambia algo de tus incidencias"),
        ("&#128202; Panel Admin", "Solo para admins: estadisticas y gestion"),
        ("&#128421;&#65039; Activos ITAM", "Inventario de equipos (ordenadores, moviles...)"),
        ("&#128308; Estado del sistema", "Ver si hay servicios caidos en la empresa"),
    ]
    for emoji_name, desc in modulos:
        row_data = [[
            Paragraph(emoji_name, S("mn", fontSize=10, fontName="Helvetica-Bold",
                                    textColor=INDIGO_D)),
            Paragraph(desc, S("md", fontSize=10, textColor=SLATE_700, fontName="Helvetica")),
        ]]
        rt = Table(row_data, colWidths=[4.5*cm, W-4*cm-4.5*cm-0.5*cm])
        rt.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,-1), SLATE_100),
            ("TOPPADDING",    (0,0), (-1,-1), 6),
            ("BOTTOMPADDING", (0,0), (-1,-1), 6),
            ("LEFTPADDING",   (0,0), (-1,-1), 10),
            ("RIGHTPADDING",  (0,0), (-1,-1), 10),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
            ("LINEBELOW",     (0,0), (-1,0), 0.5, HexColor("#e2e8f0")),
        ]))
        story += [rt]

    story += [PageBreak()]

    # ══════════════════════════════════════════════════════
    # 2. GUIA EMPLEADOS
    # ══════════════════════════════════════════════════════
    story += [
        chapter_banner("&#128100;", "2. Guia para Empleados", HexColor("#0ea5e9")),
        sp(16),
        p("Esta seccion es para <b>todos los empleados</b> de Te Quiero. Da igual tu departamento o lo que hagas en la empresa, esto es para ti. &#128522;"),
        sp(10),

        # 2.1 Iniciar sesion
        p("2.1  &#128273; Iniciar sesion", section_title),
        hr(),
        p("Para entrar a TQ-HELP necesitas el <b>email corporativo</b> y tu <b>contrasena</b>."),
        sp(6),
        p("<b>Pasos para entrar:</b>"),
        b("Abre tu navegador (Chrome, Firefox, Edge...) &#127760;"),
        b("Ve a la direccion que te dio tu empresa"),
        b("Escribe tu email: por ejemplo, ana.garcia@joyeriatequiero.com &#128231;"),
        b("Escribe tu contrasena y pulsa Entrar"),
        sp(8),
        tip_box("La primera vez que entras, el sistema te pedira que cambies la contrasena. Pon una que recuerdes bien pero que no sea facil de adivinar. Por ejemplo: MiPerroSeL1ama!", "tip"),
        sp(8),
        tip_box("Si olvidas tu contrasena, dile a tu responsable o a IT que te la reseteen. No hay boton de 'olvide mi contrasena' por seguridad.", "warn"),
        sp(12),

        # 2.2 Crear incidencia
        p("2.2  &#128195; Crear una incidencia", section_title),
        hr(),
        p("Una <b>incidencia</b> es un problema que tienes y necesitas que alguien lo resuelva. Por ejemplo:"),
        b("Mi ordenador no enciende &#128187;"),
        b("La impresora no imprime &#128438;"),
        b("No puedo acceder a mis archivos &#128193;"),
        b("Tengo un error en el programa que uso &#10060;"),
        sp(8),
        p("<b>Como crear una incidencia:</b>"),
        sp(4),
    ]

    steps = [
        ("1", "Haz clic en '+ Nueva incidencia' en el menu de la izquierda o en el boton azul"),
        ("2", "Primero aparece el CHATBOT &#129302; - es un asistente que busca si ya hay una respuesta para tu problema"),
        ("3", "Escribe tu pregunta al chatbot. Si tiene respuesta, te la muestra y puedes resolver el problema sin crear una incidencia!"),
        ("4", "Si el chatbot no puede ayudarte, haz clic en 'Crear incidencia de todas formas'"),
        ("5", "Rellena el formulario: titulo, descripcion, prioridad y departamento"),
        ("6", "Puedes adjuntar fotos o archivos si ayudan a entender el problema &#128247;"),
        ("7", "Haz clic en 'Crear incidencia' y listo! &#10004;&#65039;"),
    ]
    for num, text in steps:
        row = [[
            Paragraph(f"<b>{num}</b>", S("sn", fontSize=12, textColor=WHITE,
                      fontName="Helvetica-Bold", alignment=TA_CENTER)),
            Paragraph(text, S("st", fontSize=10.5, textColor=SLATE_700, fontName="Helvetica")),
        ]]
        st = Table(row, colWidths=[0.7*cm, W-4*cm-0.7*cm-0.3*cm])
        st.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (0,0), INDIGO),
            ("BACKGROUND",    (1,0), (1,0), INDIGO_L),
            ("TOPPADDING",    (0,0), (-1,-1), 7),
            ("BOTTOMPADDING", (0,0), (-1,-1), 7),
            ("LEFTPADDING",   (0,0), (-1,-1), 8),
            ("RIGHTPADDING",  (0,0), (-1,-1), 8),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
            ("LINEBELOW",     (0,0), (-1,-1), 0.5, HexColor("#c7d2fe")),
        ]))
        story += [st]

    story += [
        sp(10),
        tip_box("El chatbot puede ahorrarte mucho tiempo! Muchas dudas ya tienen respuesta en la FAQ. Preguntale primero antes de crear la incidencia.", "tip"),
        sp(12),

        # 2.3 Ver incidencias
        p("2.3  &#128270; Ver mis incidencias", section_title),
        hr(),
        p("En el menu lateral haz clic en <b>Incidencias</b>. Ahi veras todas las que has creado."),
        sp(6),
        p("<b>Estados de una incidencia:</b>"),
        sp(4),
    ]

    estados = [
        ("&#128993; Abierto",      "#fef9c3", "#ca8a04", "La incidencia fue recibida y esta esperando que alguien la coja"),
        ("&#128994; En progreso",  "#dbeafe", "#1d4ed8", "Alguien ya esta trabajando en resolver tu problema"),
        ("&#128154; Resuelto",     "#dcfce7", "#15803d", "El problema fue solucionado. Puedes valorar el servicio!"),
        ("&#9898; Cerrado",        "#f1f5f9", "#475569", "La incidencia esta completamente cerrada"),
    ]
    for estado, bg, color, desc in estados:
        row = [[
            Paragraph(estado, S("es", fontSize=10, fontName="Helvetica-Bold",
                               textColor=HexColor(color))),
            Paragraph(desc, S("ed", fontSize=10, textColor=SLATE_700, fontName="Helvetica")),
        ]]
        et = Table(row, colWidths=[3.5*cm, W-4*cm-3.5*cm-0.5*cm])
        et.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (0,0), HexColor(bg)),
            ("BACKGROUND",    (1,0), (1,0), SLATE_100),
            ("TOPPADDING",    (0,0), (-1,-1), 7),
            ("BOTTOMPADDING", (0,0), (-1,-1), 7),
            ("LEFTPADDING",   (0,0), (-1,-1), 10),
            ("RIGHTPADDING",  (0,0), (-1,-1), 10),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
            ("LINEBELOW",     (0,0), (-1,-1), 0.5, HexColor("#e2e8f0")),
        ]))
        story += [et]

    story += [
        sp(10),
        p("Puedes <b>filtrar</b> las incidencias por estado, prioridad o departamento usando los botones de arriba. &#128269;"),
        sp(12),

        # 2.4 Comentar
        p("2.4  &#128172; Comentar y chatear en tiempo real", section_title),
        hr(),
        p("Dentro de cada incidencia puedes escribir comentarios para comunicarte con el equipo que la gestiona."),
        sp(6),
        p("<b>Como funciona:</b>"),
        b("Abre la incidencia haciendo clic en su titulo"),
        b("Baja hasta la seccion 'Comentarios'"),
        b("Escribe tu mensaje en el cuadro de texto"),
        b("Pulsa el boton 'Enviar' o usa el atajo Ctrl+Enter (Cmd+Enter en Mac) &#9654;&#65039;"),
        sp(8),
        tip_box("Puedes mencionar a alguien escribiendo @nombre. Por ejemplo: '@Laura ya probe a reiniciar y sigue sin funcionar'. Esa persona recibira una notificacion especial!", "tip"),
        sp(6),
        p("Los comentarios se actualizan <b>en tiempo real</b>. Si el admin escribe algo, lo veras aparecer en tu pantalla sin necesidad de recargar la pagina. &#9889;"),
        sp(12),

        # 2.5 Prioridades
        p("2.5  &#128680; Prioridades y tiempos de resolucion (SLA)", section_title),
        hr(),
        p("Cuando creas una incidencia, tienes que indicar su <b>prioridad</b>. Esto ayuda al equipo a saber que es mas urgente."),
        sp(8),
    ]

    prioridades = [
        ("&#128308; CRITICA",  "#fee2e2", "#991b1b", "4 horas",       "El sistema entero esta caido. No puedes trabajar."),
        ("&#128992; ALTA",     "#ffedd5", "#9a3412", "1 dia",          "Un problema grave que te impide hacer tu trabajo."),
        ("&#128993; MEDIA",    "#fef9c3", "#92400e", "3 dias",         "Algo no funciona bien pero puedes trabajar con ello."),
        ("&#128994; BAJA",     "#dcfce7", "#166534", "5 dias",         "Una mejora o algo que no es urgente en absoluto."),
    ]
    for prio, bg, color, tiempo, desc in prioridades:
        row = [[
            Paragraph(prio, S("ps", fontSize=9, fontName="Helvetica-Bold",
                              textColor=HexColor(color))),
            Paragraph(f"<b>{tiempo}</b>", S("pt", fontSize=10, fontName="Helvetica-Bold",
                                            textColor=HexColor(color), alignment=TA_CENTER)),
            Paragraph(desc, S("pd", fontSize=10, textColor=SLATE_700, fontName="Helvetica")),
        ]]
        pt = Table(row, colWidths=[2.8*cm, 1.8*cm, W-4*cm-2.8*cm-1.8*cm-0.4*cm])
        pt.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (1,0), HexColor(bg)),
            ("BACKGROUND",    (2,0), (2,0), SLATE_100),
            ("TOPPADDING",    (0,0), (-1,-1), 8),
            ("BOTTOMPADDING", (0,0), (-1,-1), 8),
            ("LEFTPADDING",   (0,0), (-1,-1), 10),
            ("RIGHTPADDING",  (0,0), (-1,-1), 10),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
            ("LINEBELOW",     (0,0), (-1,-1), 0.5, HexColor("#e2e8f0")),
        ]))
        story += [pt]

    story += [
        sp(8),
        tip_box("No marques todo como CRITICO. Si todo es urgente, nada es urgente. Usa CRITICA solo cuando de verdad no puedas trabajar.", "warn"),
        sp(12),

        # 2.6 Valorar
        p("2.6  &#11088; Valorar el servicio", section_title),
        hr(),
        p("Cuando tu incidencia se resuelve o cierra, puedes <b>puntuar el servicio</b> de 1 a 5 estrellas. &#11088;&#11088;&#11088;&#11088;&#11088;"),
        sp(6),
        p("Esto es muy importante porque ayuda a la empresa a saber si el equipo de soporte esta haciendo bien su trabajo. No te olvides de valorar!"),
        b("1 &#11088; = Muy insatisfecho"),
        b("2 &#11088;&#11088; = Insatisfecho"),
        b("3 &#11088;&#11088;&#11088; = Normal"),
        b("4 &#11088;&#11088;&#11088;&#11088; = Satisfecho"),
        b("5 &#11088;&#11088;&#11088;&#11088;&#11088; = Muy satisfecho"),
        sp(6),
        p("Tambien puedes dejar un comentario explicando tu valoracion."),
        sp(12),

        # 2.7 Peticiones y Roadmap
        p("2.7  &#128161; Peticiones de funcionalidad y Roadmap", section_title),
        hr(),
        p("Las <b>Peticiones</b> son ideas para mejorar la empresa o sus herramientas. No es un problema, sino una sugerencia. Por ejemplo:"),
        b("'Me gustaria que el sistema enviara un recordatorio de reuniones'"),
        b("'Seria util poder ver las vacaciones del equipo en un calendario'"),
        sp(6),
        p("<b>Como funciona:</b>"),
        b("Ve a la seccion 'Peticiones' en el menu"),
        b("Haz clic en '+ Nueva peticion'"),
        b("Describe tu idea con detalle"),
        b("Otros compañeros pueden <b>votar</b> tu idea con el pulgar arriba &#128077;"),
        b("Las ideas con mas votos tienen mas posibilidades de hacerse realidad!"),
        sp(8),
        p("El <b>Roadmap</b> es como un tablero donde puedes ver en que estado esta cada idea:"),
        b("Pendiente &#9210; La idea esta en lista de espera"),
        b("En revision &#128269; El equipo la esta estudiando"),
        b("En desarrollo &#128736; Ya se esta construyendo"),
        b("Completado &#9989; Ya esta disponible"),
        sp(12),

        # 2.8 FAQ
        p("2.8  &#128218; FAQ - Preguntas frecuentes", section_title),
        hr(),
        p("La <b>FAQ</b> (Frequently Asked Questions = Preguntas Frecuentes) es una lista de respuestas a los problemas mas comunes."),
        sp(6),
        p("Antes de crear una incidencia, <b>revisa la FAQ</b>. Quizas tu problema ya tiene solucion y puedes resolverlo tu mismo en 2 minutos!"),
        sp(6),
        p("La FAQ tiene respuestas sobre: IT, RRHH, Contabilidad, Logistica, Marketing, y mucho mas."),
        sp(8),
        tip_box("El chatbot que aparece al crear una incidencia busca automaticamente en la FAQ. Aprovechalo!", "ok"),
        sp(12),

        # 2.9 Canal de denuncias
        p("2.9  &#128737;&#65039; Canal de denuncias anonimo", section_title),
        hr(),
        p("El canal de denuncias es un lugar <b>completamente anonimo</b> donde puedes reportar situaciones graves en la empresa. Por ejemplo:"),
        b("Acoso laboral o bullying en el trabajo"),
        b("Fraude o robo"),
        b("Discriminacion"),
        b("Conflicto de intereses"),
        sp(8),
        tip_box("NADIE puede saber quien envio la denuncia. No se guarda ningun dato tuyo. Es 100% anonimo.", "ok"),
        sp(6),
        p("<b>Como funciona:</b>"),
        b("Ve a la seccion 'Canal de denuncias' en el menu"),
        b("Elige la categoria y escribe lo que ocurrio con detalle"),
        b("Haz clic en 'Enviar denuncia de forma anonima'"),
        b("El sistema te dara un <b>CODIGO DE SEGUIMIENTO</b> (por ejemplo: ABCD-1234)"),
        sp(6),
        tip_box("GUARDA ESE CODIGO! Es la unica forma de consultar el estado de tu denuncia despues. Si lo pierdes, no podras hacer seguimiento.", "warn"),
        sp(6),
        p("Con el codigo puedes ir a 'Consultar denuncia' y ver en que estado esta tu caso."),
        sp(12),
    ]

    story += [
        # 2.10 Notificaciones push
        p("2.10  &#128276; Notificaciones push", section_title),
        hr(),
        p("Las notificaciones push son avisos que te llegan directamente al navegador, como los que te llegan al movil de WhatsApp."),
        sp(6),
        p("<b>Como activarlas:</b>"),
        b("Ve a la seccion 'Notificaciones' en el menu"),
        b("Haz clic en el boton 'Activar notificaciones push'"),
        b("El navegador te pedira permiso - haz clic en 'Permitir'"),
        b("Listo! Ya recibiras avisos automaticos &#127881;"),
        sp(6),
        p("<b>Cuando recibes una notificacion?</b>"),
        b("Cuando cambia el estado de tu incidencia"),
        b("Cuando alguien responde a tu incidencia"),
        b("Cuando alguien te menciona con @tunombre"),
        sp(8),
        tip_box("Las notificaciones funcionan aunque tengas el navegador minimizado. Muy util para no perderte nada importante!", "tip"),
        sp(12),

        # 2.11 Buscador global
        p("2.11  &#128269; Buscador global (Ctrl+K)", section_title),
        hr(),
        p("El buscador global te permite encontrar cualquier cosa en TQ-HELP rapidamente."),
        sp(6),
        p("<b>Como usarlo:</b>"),
        b("Pulsa <b>Ctrl+K</b> en Windows/Linux o <b>Cmd+K</b> en Mac"),
        b("Escribe lo que buscas (una incidencia, una FAQ, un usuario...)"),
        b("Usa las flechas del teclado para moverte por los resultados"),
        b("Pulsa Enter para abrir el resultado seleccionado"),
        b("Pulsa Escape para cerrar el buscador"),
        sp(8),
        tip_box("El buscador encuentra incidencias, peticiones, FAQs y usuarios todo a la vez. Es mucho mas rapido que buscar en cada seccion!", "tip"),
        sp(10),
        PageBreak(),
    ]

    # ══════════════════════════════════════════════════════
    # 3. GUIA ADMIN DEPARTAMENTO
    # ══════════════════════════════════════════════════════
    story += [
        chapter_banner("&#128736;", "3. Guia para Administradores de Departamento", INDIGO),
        sp(12),
        p("Si eres <b>Admin de Departamento</b>, tienes todo lo que tienen los empleados y ademas puedes gestionar las incidencias de tu departamento. &#128081;"),
        sp(8),

        # 3.1 Gestionar incidencias
        p("3.1  &#128203; Gestionar incidencias del departamento", section_title),
        hr(),
        p("En la lista de incidencias veras <b>todas las de tu departamento</b>, no solo las tuyas."),
        sp(6),
        p("<b>Que puedes hacer desde el detalle de una incidencia?</b>"),
        sp(6),
    ]

    acciones_admin = [
        ("&#128260; Cambiar estado",    "De Abierto a En progreso, Resuelto o Cerrado"),
        ("&#128680; Cambiar prioridad", "Subir o bajar la urgencia si es necesario"),
        ("&#128100; Asignar agente",    "Asignar la incidencia a un compañero del equipo"),
        ("&#127881; Responder",         "Escribir comentarios internos o publicos"),
        ("&#128279; Vincular activos",  "Relacionar la incidencia con un equipo del inventario"),
        ("&#128279; Relacionar tickets","Vincular incidencias relacionadas entre si"),
        ("&#128260; Convertir",         "Convertir una incidencia en peticion de funcionalidad"),
    ]
    for accion, desc in acciones_admin:
        row = [[
            Paragraph(accion, S("aa", fontSize=10, fontName="Helvetica-Bold", textColor=INDIGO_D)),
            Paragraph(desc, S("ad", fontSize=10, textColor=SLATE_700, fontName="Helvetica")),
        ]]
        at = Table(row, colWidths=[4*cm, W-4*cm-4*cm-0.5*cm])
        at.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,-1), SLATE_100),
            ("TOPPADDING",    (0,0), (-1,-1), 7),
            ("BOTTOMPADDING", (0,0), (-1,-1), 7),
            ("LEFTPADDING",   (0,0), (-1,-1), 10),
            ("RIGHTPADDING",  (0,0), (-1,-1), 10),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
            ("LINEBELOW",     (0,0), (-1,-1), 0.5, HexColor("#e2e8f0")),
        ]))
        story += [at]

    story += [
        sp(10),
        tip_box("Los comentarios marcados como 'Interno' solo los ven los admins. Perfectos para notas que no quieres que vea el empleado.", "tip"),
        sp(12),

        # 3.2 Panel admin
        p("3.2  &#128202; Panel admin", section_title),
        hr(),
        p("El Panel Admin es tu centro de control. &#129351; Accede desde 'Panel admin' en el menu lateral."),
        sp(6),
        p("Tiene <b>4 pestañas</b>:"),
        sp(6),
    ]

    tabs = [
        ("&#127968; Resumen",   "KPIs en tiempo real: incidencias abiertas, tiempo de resolucion, SLA..."),
        ("&#128202; Analytics", "Graficos de tendencias, heatmap de incidencias por hora/dia, estadisticas avanzadas"),
        ("&#128100; Agentes",   "Rendimiento de cada agente: tickets resueltos, tiempo medio, valoracion CSAT"),
        ("&#128190; Exportar",  "Descarga todas las incidencias en formato Excel/CSV"),
    ]
    for tab, desc in tabs:
        row = [[
            Paragraph(tab, S("ts", fontSize=10, fontName="Helvetica-Bold", textColor=WHITE)),
            Paragraph(desc, S("td", fontSize=10, textColor=SLATE_700, fontName="Helvetica")),
        ]]
        tt = Table(row, colWidths=[3.2*cm, W-4*cm-3.2*cm-0.5*cm])
        tt.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (0,0), INDIGO),
            ("BACKGROUND",    (1,0), (1,0), INDIGO_L),
            ("TOPPADDING",    (0,0), (-1,-1), 8),
            ("BOTTOMPADDING", (0,0), (-1,-1), 8),
            ("LEFTPADDING",   (0,0), (-1,-1), 10),
            ("RIGHTPADDING",  (0,0), (-1,-1), 10),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
            ("LINEBELOW",     (0,0), (-1,-1), 0.5, HexColor("#c7d2fe")),
        ]))
        story += [tt]

    story += [
        sp(12),

        # 3.3 Plantillas
        p("3.3  &#128196; Plantillas de tickets", section_title),
        hr(),
        p("Las plantillas te permiten crear incidencias frecuentes con un solo clic, sin tener que escribir todo desde cero."),
        sp(6),
        p("<b>Por ejemplo:</b> Si cada semana recibes una incidencia de 'Actualizar software en equipos', puedes crear una plantilla con el titulo, descripcion y prioridad ya rellenados."),
        sp(6),
        p("Ve a <b>Plantillas</b> en el menu para crear y gestionar las tuyas."),
        sp(12),

        # 3.4 Recurrentes
        p("3.4  &#128257; Tickets recurrentes", section_title),
        hr(),
        p("Los tickets recurrentes son incidencias que se crean <b>automaticamente</b> cada cierto tiempo."),
        sp(6),
        p("<b>Para que sirven?</b> Por ejemplo:"),
        b("Recordatorio de hacer copia de seguridad cada semana &#128190;"),
        b("Revision mensual del inventario de equipos &#128421;&#65039;"),
        b("Actualizacion trimestral de contrasenas &#128274;"),
        sp(6),
        p("Puedes configurar la frecuencia: diaria, semanal, mensual o anual. El sistema los crea solo!"),
        sp(12),

        # 3.5 FAQ admin
        p("3.5  &#128218; Gestion de FAQ", section_title),
        hr(),
        p("Desde <b>Gestion FAQ</b> en el menu puedes añadir, editar u ocultar preguntas de la base de conocimiento."),
        sp(6),
        p("Las preguntas activas son las que ve el chatbot y todos los empleados en /faq."),
        sp(6),
        tip_box("Cuantas mas FAQs buenas tengas, menos incidencias triviales recibiras. El chatbot las usa automaticamente!", "ok"),
        sp(10),
        PageBreak(),
    ]

    # ══════════════════════════════════════════════════════
    # 4. GUIA SUPERADMIN
    # ══════════════════════════════════════════════════════
    story += [
        chapter_banner("&#128274;", "4. Guia para Superadmin", HexColor("#7c3aed")),
        sp(12),
        p("El <b>Superadmin</b> tiene acceso completo a todo el sistema. &#128081;&#128081; Con un gran poder viene una gran responsabilidad!"),
        sp(8),

        # 4.1 Usuarios
        p("4.1  &#128101; Gestion de usuarios", section_title),
        hr(),
        p("Desde <b>Usuarios</b> en el menu puedes gestionar todos los empleados del sistema."),
        sp(6),
        p("<b>Que puedes hacer?</b>"),
        b("Crear nuevos usuarios: nombre, email, departamento y rol &#128100;"),
        b("Activar o desactivar usuarios cuando entran o salen de la empresa"),
        b("Resetear la contrasena de cualquier usuario &#128273;"),
        sp(6),
        p("Cuando creas un usuario, el sistema <b>genera automaticamente una contrasena temporal</b> con las iniciales del nombre + 4 numeros + '!'. Ejemplo: para 'Ana Garcia': AG4827!"),
        sp(6),
        p("<b>Los 4 roles disponibles:</b>"),
    ]

    roles = [
        ("&#128100; EMPLOYEE",   "#0ea5e9", "Empleado normal. Puede crear y ver sus propias incidencias."),
        ("&#128736; DEPT_ADMIN", "#6366f1", "Admin de departamento. Ve y gestiona las incidencias de su dept."),
        ("&#128065; VIEWER",     "#64748b", "Solo puede ver. No puede crear ni modificar nada."),
        ("&#128274; SUPERADMIN", "#7c3aed", "Acceso total a todo el sistema."),
    ]
    for rol, color, desc in roles:
        row = [[
            Paragraph(rol, S("rs", fontSize=9, fontName="Helvetica-Bold",
                             textColor=WHITE, alignment=TA_CENTER)),
            Paragraph(desc, S("rd", fontSize=10, textColor=SLATE_700, fontName="Helvetica")),
        ]]
        rolt = Table(row, colWidths=[3.2*cm, W-4*cm-3.2*cm-0.5*cm])
        rolt.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (0,0), HexColor(color)),
            ("BACKGROUND",    (1,0), (1,0), SLATE_100),
            ("TOPPADDING",    (0,0), (-1,-1), 8),
            ("BOTTOMPADDING", (0,0), (-1,-1), 8),
            ("LEFTPADDING",   (0,0), (-1,-1), 10),
            ("RIGHTPADDING",  (0,0), (-1,-1), 10),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
            ("LINEBELOW",     (0,0), (-1,-1), 0.5, HexColor("#e2e8f0")),
        ]))
        story += [rolt]

    story += [
        sp(12),

        # 4.2 Reglas de negocio
        p("4.2  &#9889; Reglas de negocio automaticas", section_title),
        hr(),
        p("Las reglas de negocio son <b>automatizaciones</b> que hacen cosas por su cuenta cuando se cumplen ciertas condiciones."),
        sp(6),
        p("<b>Ejemplos de reglas:</b>"),
        b("Si la prioridad es CRITICA → Asignar automaticamente a Ana Garcia"),
        b("Si el departamento origen es IT → Añadir la etiqueta 'infraestructura'"),
        b("Si el titulo contiene 'urgente' → Cambiar prioridad a ALTA"),
        sp(6),
        p("Para crear una regla ve a <b>Reglas de negocio</b> en el menu y haz clic en '+ Nueva regla'."),
        sp(6),
        tip_box("Las reglas se aplican automaticamente al crear una incidencia. Ahorran mucho tiempo a los admins!", "tip"),
        sp(12),

        # 4.3 Estado del sistema
        p("4.3  &#128308; Estado del sistema", section_title),
        hr(),
        p("Desde <b>Estado del sistema</b> puedes gestionar la pagina publica de estado (/status) que todos pueden ver."),
        sp(6),
        p("<b>Que puedes hacer?</b>"),
        b("Crear servicios: Email, VPN, ERP, etc."),
        b("Cambiar el estado de cada servicio: Operativo &#128994;, Degradado &#128993;, Caido &#128308;"),
        b("Abrir incidencias de servicio para comunicar problemas a todos"),
        b("Resolver incidencias cuando el servicio vuelve a funcionar"),
        sp(6),
        tip_box("Cuando hay un servicio caido, comunicalo aqui inmediatamente. Asi los empleados saben que no es culpa suya y no crean 50 incidencias iguales!", "warn"),
        sp(12),

        # 4.4 Widget
        p("4.4  &#128421;&#65039; Widget embebible", section_title),
        hr(),
        p("El widget es un pequeño boton que puedes añadir a cualquier pagina web interna de la empresa."),
        sp(6),
        p("Cuando alguien hace clic en el, puede crear una incidencia sin tener que entrar a TQ-HELP."),
        sp(6),
        p("Desde <b>Widget embebible</b> en el menu obtienes el codigo HTML que tienes que pegar en tu web."),
        sp(12),

        # 4.5 Informes
        p("4.5  &#128229; Informes PDF automaticos semanales", section_title),
        hr(),
        p("Cada lunes a las 8:00, el sistema envia automaticamente un <b>informe PDF</b> por email a todos los superadmins."),
        sp(6),
        p("<b>Que incluye el informe?</b>"),
        b("Total de incidencias de la semana anterior"),
        b("Cuantas se resolvieron dentro del SLA"),
        b("Valoracion media CSAT de los empleados"),
        b("Desglose por departamento"),
        sp(6),
        tip_box("No necesitas hacer nada. Llega solo a tu email cada lunes. Perfecto para la reunion de equipo! &#128203;", "ok"),
        sp(10),
        PageBreak(),
    ]

    # ══════════════════════════════════════════════════════
    # 5. CONSEJOS Y TRUCOS
    # ══════════════════════════════════════════════════════
    story += [
        chapter_banner("&#9889;", "5. Consejos y trucos", HexColor("#0891b2")),
        sp(16),
        p("Aqui tienes los mejores trucos para usar TQ-HELP como un profesional. &#128171;"),
        sp(12),

        p("&#9000;&#65039; Atajos de teclado", subsection_title),
        hr(),
        sp(4),
    ]

    shortcuts = [
        ("Ctrl+K  /  Cmd+K",      "Abrir el buscador global desde cualquier pagina"),
        ("Ctrl+Enter  /  Cmd+Enter", "Enviar un comentario sin hacer clic en el boton"),
        ("Escape",                 "Cerrar modales, popups y el buscador"),
        ("Flechas Arriba/Abajo",   "Navegar por los resultados del buscador"),
        ("Enter",                  "Seleccionar el resultado del buscador"),
    ]
    for key, desc in shortcuts:
        row = [[
            Paragraph(key, S("ks", fontSize=10, fontName="Helvetica-Bold",
                             textColor=INDIGO_D)),
            Paragraph(desc, S("kd", fontSize=10, textColor=SLATE_700, fontName="Helvetica")),
        ]]
        kt = Table(row, colWidths=[4.5*cm, W-4*cm-4.5*cm-0.5*cm])
        kt.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (0,0), INDIGO_L),
            ("BACKGROUND",    (1,0), (1,0), SLATE_100),
            ("TOPPADDING",    (0,0), (-1,-1), 8),
            ("BOTTOMPADDING", (0,0), (-1,-1), 8),
            ("LEFTPADDING",   (0,0), (-1,-1), 12),
            ("RIGHTPADDING",  (0,0), (-1,-1), 12),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
            ("LINEBELOW",     (0,0), (-1,-1), 0.5, HexColor("#e2e8f0")),
        ]))
        story += [kt]

    story += [
        sp(14),
        p("&#128302; Usa siempre el chatbot primero", subsection_title),
        hr(),
        p("Antes de crear una incidencia, preguntale al chatbot. Puede ahorrarte tiempo y evitar que el equipo de soporte se sature con preguntas que ya tienen respuesta."),
        sp(8),

        p("&#128276; Activa las notificaciones push", subsection_title),
        hr(),
        p("Con las notificaciones push activas, sabras al instante cuando cambia algo en tus incidencias. No tendras que estar entrando a la app para ver si hay novedades."),
        sp(8),

        p("&#128269; Describe bien tus incidencias", subsection_title),
        hr(),
        p("Cuanta mas informacion pongas al crear la incidencia, mas rapido podran ayudarte:"),
        b("Que intentaste hacer cuando paso el problema"),
        b("Desde cuando ocurre"),
        b("Si pasa siempre o solo a veces"),
        b("Adjunta capturas de pantalla si puedes &#128247;"),
        sp(8),

        p("&#11088; Valora siempre el servicio", subsection_title),
        hr(),
        p("Cuando resuelvan tu incidencia, tarda 10 segundos en poner las estrellas. Ayuda mucho a mejorar el servicio para todos."),
        sp(10),
        PageBreak(),
    ]

    # ══════════════════════════════════════════════════════
    # 6. FAQ DEL SISTEMA
    # ══════════════════════════════════════════════════════
    story += [
        chapter_banner("&#10067;", "6. Preguntas frecuentes sobre el sistema", HexColor("#0891b2")),
        sp(16),
    ]

    faqs = [
        ("No puedo entrar a TQ-HELP. Que hago?",
         "Comprueba que tu email y contrasena son correctos. Si olvidaste la contrasena, pide a tu responsable o a IT que te la reseteen. Si el problema persiste, comprueba la pagina /status para ver si hay una incidencia general."),

        ("Por que aparece un chatbot cuando voy a crear una incidencia?",
         "El chatbot intenta ayudarte a resolver tu problema antes de crearlo. Muchas veces la solucion ya esta en la FAQ y puedes resolverlo solo en segundos sin esperar a que alguien te atienda."),

        ("Puedo crear incidencias desde el movil?",
         "Si! TQ-HELP funciona perfectamente en el navegador del movil. Tambien puedes activar las notificaciones push desde el movil."),

        ("Cuanto tiempo tardan en resolver mi incidencia?",
         "Depende de la prioridad: Critica=4h, Alta=1 dia, Media=3 dias, Baja=5 dias. Si tu incidencia supera ese tiempo sin resolverse, puedes añadir un comentario o hablar con tu responsable."),

        ("Puedo ver las incidencias de mis companeros?",
         "Los empleados normales solo ven sus propias incidencias. Los admins de departamento ven las de su departamento. Los superadmins lo ven todo."),

        ("El chatbot no entendio mi pregunta. Que hago?",
         "Escribe de forma sencilla y directa. Por ejemplo: 'impresora no imprime' en vez de 'tengo un problema con el dispositivo de impresion'. Si sigue sin funcionar, haz clic en 'Crear incidencia de todas formas'."),

        ("Perdi el codigo de seguimiento de mi denuncia. Que pasa?",
         "Lamentablemente no hay forma de recuperarlo. El sistema es completamente anonimo y no guarda ningun dato tuyo. Para futuras denuncias, apunta el codigo en un lugar seguro."),

        ("Puedo adjuntar archivos a mis incidencias?",
         "Si! Puedes adjuntar imagenes, videos y documentos (maximo 50MB por archivo). Las imagenes se muestran directamente en la incidencia con visor. Los videos se pueden reproducir desde la app."),

        ("Como menciono a alguien en un comentario?",
         "Escribe @ seguido del nombre del usuario. Por ejemplo: @Laura. Esa persona recibira una notificacion especial. Muy util para llamar la atencion de alguien sobre tu incidencia."),

        ("Que es el SLA?",
         "SLA (Service Level Agreement) es el tiempo maximo que se tiene para resolver una incidencia segun su prioridad. Si se supera ese tiempo, la incidencia se marca con un aviso rojo de 'SLA superado'."),
    ]

    for i, (q, a) in enumerate(faqs):
        faq_data = [
            [Paragraph(f"&#10067; {q}", S("fq", fontSize=11, fontName="Helvetica-Bold",
                                          textColor=INDIGO_D))],
            [Paragraph(a, S("fa", fontSize=10.5, textColor=SLATE_700,
                            fontName="Helvetica", leading=16))],
        ]
        ft = Table(faq_data, colWidths=[W - 4*cm])
        ft.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (0,0), INDIGO_L),
            ("BACKGROUND",    (0,1), (0,1), SLATE_100),
            ("TOPPADDING",    (0,0), (-1,-1), 10),
            ("BOTTOMPADDING", (0,0), (-1,-1), 10),
            ("LEFTPADDING",   (0,0), (-1,-1), 14),
            ("RIGHTPADDING",  (0,0), (-1,-1), 14),
            ("LINEAFTER",     (0,0), (0,0), 3, INDIGO),
        ]))
        story += [ft, sp(6)]

    # Pagina final
    story += [
        PageBreak(),
        Spacer(1, 4*cm),
        p("&#128142;", S("fe", fontSize=60, alignment=TA_CENTER, leading=80)),
        sp(10),
        p("Gracias por usar TQ-HELP", S("ft", fontSize=24, leading=32,
                                         textColor=INDIGO, alignment=TA_CENTER,
                                         fontName="Helvetica-Bold")),
        sp(8),
        p("Joyeria Te Quiero  &#183;  Sistema de soporte interno", S("fs", fontSize=13,
            leading=18, textColor=SLATE_500, alignment=TA_CENTER, fontName="Helvetica")),
        sp(6),
        p("Si tienes dudas sobre el propio sistema, crea una incidencia &#128521;",
          S("fh", fontSize=11, leading=16, textColor=SLATE_500,
            alignment=TA_CENTER, fontName="Helvetica")),
    ]

    doc.build(story)
    print(f"PDF generado: {OUTPUT}")

if __name__ == "__main__":
    build()
