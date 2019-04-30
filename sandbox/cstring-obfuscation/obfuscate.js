#!/usr/bin/env node

const { readSync } = require("fs");

var ZCrypt = ZCrypt || {};
ZCrypt.ADD = 0;
ZCrypt.SUB = 1;
ZCrypt.XOR = 2;
ZCrypt.NOT = 3;
ZCrypt.SHIFT = 4;
ZCrypt.ADD_MORPH = 5;
ZCrypt.SUB_MORPH = 6;
ZCrypt.XOR_MORPH = 7;
ZCrypt.NEG = 8;

ZCrypt.int_rand = function(min, max)
{
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

ZCrypt.make_add = function()
{
    return [[ZCrypt.ADD, ZCrypt.do_add], ZCrypt.int_rand(1, 0xff)];
}

ZCrypt.make_sub = function()
{
    return [[ZCrypt.SUB, ZCrypt.do_sub], ZCrypt.int_rand(1, 0xff)];
}

ZCrypt.make_xor = function()
{
    return [[ZCrypt.XOR, ZCrypt.do_xor], ZCrypt.int_rand(1, 0xff)];
}

ZCrypt.make_not = function()
{
    return [[ZCrypt.NOT, ZCrypt.do_not]];
}

ZCrypt.make_neg = function()
{
    return [[ZCrypt.NEG, ZCrypt.do_neg]];
}

ZCrypt.make_shift = function()
{
    var bits1 = ZCrypt.int_rand(1, 6);

    if (bits1 == 4)
        bits1 = 7;

    var bits2 = 8 - bits1;

    return [[ZCrypt.SHIFT, ZCrypt.do_shift], [bits1, bits2]];
}

ZCrypt.make_add_morph = function()
{
    return [[ZCrypt.ADD_MORPH, ZCrypt.do_add_morph]];
}

ZCrypt.make_sub_morph = function()
{
    return [[ZCrypt.SUB_MORPH, ZCrypt.do_sub_morph]];
}

ZCrypt.make_xor_morph = function()
{
    return [[ZCrypt.XOR_MORPH, ZCrypt.do_xor_morph]];
}

ZCrypt.do_add = function(c, arg)
{
    return (c + arg) & 0xff;
}

ZCrypt.do_sub = function(c, arg)
{
    return (c - arg) & 0xff;
}

ZCrypt.do_xor = function(c, arg)
{
    return (c ^ arg) & 0xff;
}

ZCrypt.do_not = function(c)
{
    return (~c) & 0xff;
}

ZCrypt.do_neg = function(c)
{
    return (-c) & 0xff;
}

ZCrypt.do_shift = function(c, args)
{
    return ((c >> args[0]) & 0xff) | ((c << args[1]) & 0xff);
}

ZCrypt.do_add_morph = function(c, args, morph)
{
    return ZCrypt.do_add(c, morph);
}

ZCrypt.do_sub_morph = function(c, args, morph)
{
    return ZCrypt.do_sub(c, morph);
}

ZCrypt.do_xor_morph = function(c, args, morph)
{
    return ZCrypt.do_xor(c, morph);
}

ZCrypt.remove_by_value = function(array, value)
{
    var ret = [];
    for (var i = 0; i < array.length; ++i)
        if (array[i] != value)
            ret.push(array[i]);

    return ret;
}

ZCrypt.remove_all_by_value = function(array, removes)
{
    var ret = array.slice();
    for (var i = 0; i < removes.length; ++i)
        ret = ZCrypt.remove_by_value(ret, removes[i]);

    return ret;
}

ZCrypt.make_ops = function(rounds, add, sub, xor, not, shift, morph, neg)
{
    var master = []
    if (add) master.push(ZCrypt.make_add);
    if (sub) master.push(ZCrypt.make_sub);
    if (xor) master.push(ZCrypt.make_xor);
    if (not) master.push(ZCrypt.make_not);
    if (shift) master.push(ZCrypt.make_shift);
    if (add && morph) master.push(ZCrypt.make_add_morph);
    if (sub && morph) master.push(ZCrypt.make_sub_morph);
    if (xor && morph) master.push(ZCrypt.make_xor_morph);
    if (neg) master.push(ZCrypt.make_neg);

    var nops = [];
    nops.push([ZCrypt.make_add, ZCrypt.make_add_morph, ZCrypt.make_sub, ZCrypt.make_sub_morph]);
    nops.push([ZCrypt.make_xor, ZCrypt.make_xor_morph]);

    var last = -1;
    var ops = [];

    for (var round = 0; round < rounds; ++round)
    {
        var current = master.slice();
        if (current.length > 1)
        {
                for (var nop = 0; nop < nops.length; ++nop)
                    for (var item = 0; item < nops[nop].length; ++item)
                        if (last == nops[nop][item])
                            current = ZCrypt.remove_all_by_value(current, nops[nop]);

            current = ZCrypt.remove_by_value(current, last);
        }

        last = current[Math.floor(Math.random() * current.length)];
        ops.push(last());
    }

    return ops;
}

ZCrypt.do_crypt = function(str, rounds, add, sub, xor, not, shift, morph, neg)
{
    var ops = ZCrypt.make_ops(rounds, add, sub, xor, not, shift, morph, neg);

    var cs = [];

    for (var i = 0; i < str.length; ++i)
    {
        var c = str.charCodeAt(i) & 0xff;
        for (var op_idx = 0; op_idx < ops.length; ++op_idx)
        {
            var callback = ops[op_idx][0][1];
            var args = ops[op_idx][1];
            c = callback(c, args, i);
        }
        cs.push(c);
    }

    return [ops, cs];
}

ZCrypt.generate_c = function(ops, cs)
{

    var code = "";
    code += "unsigned char s[] = \n{\n";

    for (var i = 0; i < cs.length; ++i)
    {
        if ((i % 8) == 0)
            code += "\n    ";

        code += "0x" + cs[i].toString(16) + ", ";
    }

    code = code.slice(0, -2);

    code += "\n};\n\n";

    code += "for (unsigned int m = 0; m < sizeof(s); ++m)\n{\n"
    code += "    unsigned char c = s[m];\n";

    ops = ops.reverse();
    for (var i = 0; i < ops.length; ++i)
    {
        code += "    c ";

        var op = ops[i][0][0];
        switch (op)
        {
            case ZCrypt.ADD:
                code += "-= 0x" + ops[i][1].toString(16);
            break;
            case ZCrypt.SUB:
                code += "+= 0x" + ops[i][1].toString(16);
            break;
            case ZCrypt.NOT:
                code += "= ~c";
            break;
            case ZCrypt.XOR:
                code += "^" + "= 0x" + ops[i][1].toString(16);
            break;
            case ZCrypt.SHIFT:
                var first = "0x" + ops[i][1][1].toString(16);
                var second = "0x" + ops[i][1][0].toString(16);
                code += "= (c >> " + first + ") | (c << " + second  + ")";
            break;
            case ZCrypt.ADD_MORPH:
                code += "-= m"
            break;
            case ZCrypt.SUB_MORPH:
                code += "+= m"
            break;
            case ZCrypt.XOR_MORPH:
                code += "^= m"
            break;
            case ZCrypt.NEG:
                code += "= -c"
            break;
            default:
                code += "UNKNOWN OP = + " + op.toString();
            break;
        }

        code += ";\n"

    }

    code += "    s[m] = c;\n}\n\n";
    code += '// printf("%s\\n", s);';

    return code;
}

ZCrypt.cryptstr = function(times, plaintext)
{
    var str = plaintext;
    var neg = true;
    var add = true;
    var sub = true;
    var xor = true;
    var not = true;
    var shift = true;
    var morph = true;
    var rounds = times > 0 ? times : 15;

    try {
        str += "\x00";
        var args = ZCrypt.do_crypt(str, rounds, add, sub, xor, not, shift, morph, neg);
        var code = ZCrypt.generate_c(args[0], args[1]);
    } catch (e) {
        alert(e);
        return;
    }

    console.log(code);
}

const readPipe = () => {
    let size = 0;
    let bytes = new Buffer.alloc(131072);

    try {
        size = readSync(process.stdin.fd,
                            bytes,
                            0,
                            bytes.length);
        if(!size){
            throw 'no input stream to read. try --help';
        } else {
            return bytes.toString('utf-8',0,size);
        }
    } catch (e) {
        return '';
    }
}

const argc = process.argv.filter(function(){
  return true;
}).length;

if (3 === argc) {
    let data = readPipe();
    if(data.length > 0){
      ZCrypt.cryptstr(process.argv[2], data);
      process.exit(0);
    }
    process.exit(1);
}
process.exit(2);
