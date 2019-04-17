// !c++
//      ------------------------------
//              MIT-License 0x7e3
//       <ergotamin.source@gmail.com>
//      ------------------------------
//
#include <syswatch.h>

const char *osd_font = "-*-camingocode-bold-r-*-*-*-16px-*-*-*-*-*-*";
const char *osd_colour = "ivory";
const char *osd_shadow = "purple";
const char *osd_outline = "indigo";

struct xosd *osd;

int x11_print(const char	*text,
              unsigned int	lino,
              int			h_off,
              int			v_off)
{
    osd = xosd_create(lino);

    xosd_set_timeout(osd, 1);
    xosd_set_font(osd, osd_font);
    xosd_set_colour(osd, osd_colour);
    xosd_set_shadow_colour(osd, osd_shadow);
    xosd_set_outline_colour(osd, osd_outline);

    xosd_set_pos(osd, XOSD_top);
    xosd_set_align(osd, XOSD_center);
    xosd_set_vertical_offset(osd, v_off);
    xosd_set_horizontal_offset(osd, h_off);

    return xosd_display(osd, lino - 1, XOSD_printf, "%s", text);
    //
}
