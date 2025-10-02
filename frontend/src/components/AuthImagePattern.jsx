import { useMemo } from "react"
import Avatar, { genConfig } from "react-nice-avatar"

const makeConfigs = (count = 9) =>
    Array.from({ length: count }, (_, i) =>
        genConfig({
            sex: i % 2 === 0 ? "man" : "woman",
            hairStyle: ["short", "normal", "thick", "mohawk"][i % 4],
            shape: "circle",
        })
    )

const AuthImagePattern = ({
                              title = "Welcome to Realtime Chat",
                              subtitle = "Create an account or sign in to continue",
                          }) => {
    const configs = useMemo(() => makeConfigs(9), [])

    return (
        <div className="hidden lg:flex items-center justify-center bg-base-200 p-12">
            <div className="max-w-md text-center">
                <div className="grid grid-cols-3 gap-3 mb-8">
                    {configs.map((cfg, i) => (
                        <div
                            key={i}
                            className="aspect-square rounded-2xl bg-base-100/70 flex items-center justify-center shadow-inner overflow-hidden"
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            <div className="w-16 h-16 animate-bounce">
                                <Avatar style={{ width: "100%", height: "100%" }} {...cfg} />
                            </div>
                        </div>
                    ))}
                </div>

                <h2 className="text-2xl font-bold mb-2">{title}</h2>
                <p className="text-base-content/60">{subtitle}</p>
            </div>
        </div>
    )
}

export default AuthImagePattern
