//          -----------------------------
//                 Marcel Bobolz
//           ergotamin.source@gmail.com
//          -----------------------------
#include <gcc-plugin.h>
#include <cpplib.h>
#include <function.h>
#include <context.h>
#include <cp/cp-tree.h>
#include <c-family/c-pragma.h>
#include <c-family/c-common.h>
#include <cgraph.h>
#include <tree.h>
#include <tree-pass.h>
#include <rtl.h>
#include <genrtl.h>
#include <intl.h>
#include <tm.h>
#include <stringpool.h>
#include <line-map.h>

//   =================(LICENSE)===================

int plugin_is_GPL_compatible;

//   =================(VERSION)===================

unsigned long __attribute__((__vector_size__(16)))
vmagic = { 0x49540061302e3176UL, 0UL };

//   ===============(PLUGIN_INFO)=================

static constexpr struct plugin_info about {
    .version = (const char *)&vmagic,
    .help = "Some minor extension."
};

//   ===============(DEFINITIONS)=================

static void inject(cpp_reader *reader)
{
    int n = 0;
    tree e, ver;
    char *frac[8];
    unsigned long val[2] = { 0UL, 0UL };

    frac[7] = NULL;

cstx:
    pragma_lex(&e);
    if (TREE_CODE(e) == INTEGER_CST) {
        __builtin_memset(&val[0], 0, sizeof(unsigned long));
        val[0] = TREE_INT_CST_LOW(e);
        frac[n] = (char *)&val[0];
        frac[n] = __builtin_strdup(frac[n]);
        if (pragma_lex(&e) == CPP_COMMA) {
            n++;
            goto cstx;
        } else {
            char *fin = (char *)__builtin_calloc(128, 1);
            for (int i = 0; i <= n; i++) {
                __builtin_strcat(fin, __builtin_strdup(frac[i]));
                __builtin_free((void *)frac[i]);
            }
            ver = build_decl(
                UNKNOWN_LOCATION,
                VAR_DECL,
                get_identifier("magic_version__"),
                string_type_node);
            TREE_STATIC(ver) = 1;
            TREE_PUBLIC(ver) = 1;
            DECL_ARTIFICIAL(ver) = 1;
            DECL_INITIAL(ver) = build_string_literal(__builtin_strlen(fin), (const char *)fin);
            pushdecl(ver);
            __builtin_free((void *)fin);
        }
    } else if (e) {
        enum tree_code tc = TREE_CODE(e);
        enum tree_code_class tcl = TREE_CODE_CLASS(tc); 
        fatal_error(
            location_of(e),
            "%<#pragma __magic_version%> tree-code %i defined as %s is not supported ...\n",
            tc,
            TREE_CODE_CLASS_STRING(tcl));
    }
}

//
// **`NOTE: `**
// ```
// register_pragma...
// ```
// ` ` [**`  `**](@deps)
static void register_pragma(void *event_data, void *user_data)
{
    c_register_pragma_with_expansion(NULL, "__magic_version", inject);
}

//
// **`NOTE: `**
// ```
// Handles the plugin-initialization
// ```
// ` ` [**`  `**](@deps)
static int init(plugin_name_args *plugin, plugin_gcc_version *version)
{
    //
    register_callback(plugin->base_name, PLUGIN_PRAGMAS, register_pragma, NULL);
    //
    register_callback(plugin->base_name, PLUGIN_INFO, NULL, (void *)&about);
    //
    return 0;
}

//
// **`NOTE: `**
// ```
// Entry point for gcc-plugins
// ```
// ` ` [**`  `**](@deps)
int plugin_init(plugin_name_args *plugin_args, plugin_gcc_version *gcc_version)
{
    return init(plugin_args, gcc_version);
}
#//::eof
