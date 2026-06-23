#include <iostream>
#include <string>
#include <vector>
#include <cmath>
#include <cctype>
#include <stdexcept>
#include <sstream>
#include <map>

// Constants
const double PI = 3.14159265358979323846;
const double E  = 2.71828182845904523536;

class Calculator {
private:
    std::string src;
    size_t pos;
    bool degMode;

    char peek() {
        if (pos >= src.length()) return '\0';
        return src[pos];
    }

    char get() {
        if (pos >= src.length()) return '\0';
        return src[pos++];
    }

    void skipWhitespace() {
        while (pos < src.length() && std::isspace(src[pos])) {
            pos++;
        }
    }

    bool match(char expected) {
        skipWhitespace();
        if (peek() == expected) {
            pos++;
            return true;
        }
        return false;
    }

    // AST / Expression Rules
    // expression = term { ('+' | '-') term }
    // term       = factor { ('*' | '/') factor }
    // factor     = power { '^' power }
    // power      = [ '+' | '-' ] primary
    // primary    = number | '(' expression ')' | constant | function '(' expression ')'

    double expression();
    double term();
    double factor();
    double power();
    double primary();

public:
    Calculator(const std::string& expressionStr, bool deg) : src(expressionStr), pos(0), degMode(deg) {}

    double evaluate() {
        skipWhitespace();
        if (src.empty()) {
            throw std::runtime_error("Empty expression");
        }
        double result = expression();
        skipWhitespace();
        if (pos < src.length()) {
            throw std::runtime_error(std::string("Unexpected character at position ") + std::to_string(pos) + ": '" + src[pos] + "'");
        }
        return result;
    }
};

double Calculator::expression() {
    double result = term();
    while (true) {
        if (match('+')) {
            result += term();
        } else if (match('-')) {
            result -= term();
        } else {
            break;
        }
    }
    return result;
}

double Calculator::term() {
    double result = factor();
    while (true) {
        if (match('*')) {
            result *= factor();
        } else if (match('/')) {
            double denom = factor();
            if (denom == 0.0) {
                throw std::runtime_error("Division by zero");
            }
            result /= denom;
        } else {
            break;
        }
    }
    return result;
}

double Calculator::factor() {
    double result = power();
    if (match('^')) {
        double exponent = factor(); // recursion handles right associativity
        result = std::pow(result, exponent);
    }
    return result;
}

double Calculator::power() {
    skipWhitespace();
    if (match('+')) {
        return power();
    }
    if (match('-')) {
        return -power();
    }
    return primary();
}

double Calculator::primary() {
    skipWhitespace();
    char c = peek();

    if (c == '\0') {
        throw std::runtime_error("Unexpected end of expression");
    }

    // Parentheses
    if (match('(')) {
        double result = expression();
        if (!match(')')) {
            throw std::runtime_error("Missing closing parenthesis ')'");
        }
        return result;
    }

    // Number
    if (std::isdigit(c) || c == '.') {
        std::string numStr;
        bool dotSeen = false;
        while (true) {
            char current = peek();
            if (std::isdigit(current)) {
                numStr += get();
            } else if (current == '.') {
                if (dotSeen) {
                    throw std::runtime_error("Invalid decimal number: multiple decimal points");
                }
                dotSeen = true;
                numStr += get();
            } else {
                break;
            }
        }
        
        // Optional Scientific Notation, e.g., 1e-5 or 2.5e3
        if (peek() == 'e' || peek() == 'E') {
            numStr += get();
            if (peek() == '+' || peek() == '-') {
                numStr += get();
            }
            if (!std::isdigit(peek())) {
                throw std::runtime_error("Invalid scientific notation: missing exponent digits");
            }
            while (std::isdigit(peek())) {
                numStr += get();
            }
        }
        
        return std::stod(numStr);
    }

    // Alphabetical identifier (functions, constants)
    if (std::isalpha(c)) {
        std::string name;
        while (std::isalnum(peek())) {
            name += get();
        }

        // Check for constants
        if (name == "pi" || name == "PI") {
            return PI;
        }
        if (name == "e" || name == "E") {
            return E;
        }

        // Functions must be followed by '('
        skipWhitespace();
        if (!match('(')) {
            throw std::runtime_error("Function " + name + " must be followed by '('");
        }

        double arg = expression();
        if (!match(')')) {
            throw std::runtime_error("Missing closing parenthesis ')' after function " + name + " argument");
        }

        // Trigonometric helper functions for degree conversions
        auto toRadians = [this](double val) {
            return degMode ? (val * PI / 180.0) : val;
        };
        auto toDegrees = [this](double val) {
            return degMode ? (val * 180.0 / PI) : val;
        };

        if (name == "sin") return std::sin(toRadians(arg));
        if (name == "cos") return std::cos(toRadians(arg));
        if (name == "tan") return std::tan(toRadians(arg));
        if (name == "asin") return toDegrees(std::asin(arg));
        if (name == "acos") return toDegrees(std::acos(arg));
        if (name == "atan") return toDegrees(std::atan(arg));
        if (name == "sinh") return std::sinh(arg);
        if (name == "cosh") return std::cosh(arg);
        if (name == "tanh") return std::tanh(arg);
        
        if (name == "sqrt") {
            if (arg < 0.0) {
                throw std::runtime_error("Square root of a negative number is undefined");
            }
            return std::sqrt(arg);
        }
        if (name == "log") {
            if (arg <= 0.0) {
                throw std::runtime_error("Logarithm base 10 of non-positive number is undefined");
            }
            return std::log10(arg);
        }
        if (name == "ln") {
            if (arg <= 0.0) {
                throw std::runtime_error("Natural logarithm of non-positive number is undefined");
            }
            return std::log(arg);
        }
        if (name == "exp") return std::exp(arg);
        if (name == "abs") return std::abs(arg);
        if (name == "fact") {
            if (arg < 0) throw std::runtime_error("Factorial of negative number is undefined");
            if (std::floor(arg) != arg) throw std::runtime_error("Factorial is only defined for integers");
            double res = 1.0;
            for (int i = 1; i <= (int)arg; ++i) {
                res *= i;
            }
            return res;
        }

        throw std::runtime_error("Unknown function: " + name);
    }

    throw std::runtime_error(std::string("Unexpected character: '") + c + "'");
}

int main(int argc, char* argv[]) {
    std::string exprStr = "";
    bool deg = false;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg.rfind("--expr=", 0) == 0) {
            exprStr = arg.substr(7);
        } else if (arg.rfind("--mode=", 0) == 0) {
            std::string mode = arg.substr(7);
            if (mode == "deg") {
                deg = true;
            }
        }
    }

    if (exprStr.empty()) {
        std::cout << "{\"status\":\"error\",\"message\":\"No expression provided\"}" << std::endl;
        return 0;
    }

    try {
        Calculator calc(exprStr, deg);
        double result = calc.evaluate();
        
        if (std::isnan(result)) {
            std::cout << "{\"status\":\"error\",\"message\":\"Result is NaN (not a number)\"}" << std::endl;
        } else if (std::isinf(result)) {
            std::cout << "{\"status\":\"error\",\"message\":\"Result is infinite (overflow)\"}" << std::endl;
        } else {
            std::ostringstream ss;
            ss.precision(15);
            ss << result;
            std::cout << "{\"status\":\"success\",\"result\":" << ss.str() << "}" << std::endl;
        }
    } catch (const std::exception& e) {
        std::string err = e.what();
        std::string escapedErr = "";
        for (char c : err) {
            if (c == '"') escapedErr += "\\\"";
            else if (c == '\\') escapedErr += "\\\\";
            else escapedErr += c;
        }
        std::cout << "{\"status\":\"error\",\"message\":\"" << escapedErr << "\"}" << std::endl;
    }

    return 0;
}
