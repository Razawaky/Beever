import '../../main.css'

document.querySelector('#app').innerHTML = `
  <div class="flex flex-col justify-center items-center bg-zinc-950 min-h-screen pb-5">
    <div class="mx-auto flex w-full flex-col justify-center px-5 lg:px-6 md:max-w-[50%] lg:max-w-[50%]">
      
      <div class="my-auto mt-8 flex flex-col w-[350px] max-w-[450px] mx-auto md:mt-[70px] lg:mt-[130px]">
        <p class="flex justify-end text-[32px] font-bold text-white">Cadastro</p>
        <p class="flex justify-end mb-2.5 mt-2.5 font-normal text-zinc-400">
          Crie uma conta e se diverta!
        </p>

        <!-- Formulário de login -->
        <form novalidate class="mb-4">
          <div class="grid gap-2">
            <div class="grid gap-1">

                <label class="text-white" for="nome">Nome</label>
                    <input
                    id="name"
                    name="nome"
                    type="nome"
                    placeholder="nome"
                    autocomplete="nome"
                    class="mb-2 h-full min-h-[44px] w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-medium text-white placeholder:text-zinc-400 focus:outline-none"
                />
              
                <label class="mt-3 text-white" for="email">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nome@exemplo.com"
                    autocomplete="email"
                    class="mb-2 h-full min-h-[44px] w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-medium text-white placeholder:text-zinc-400 focus:outline-none"
                />

                <label class="mt-3 text-white mt-2" for="senha">Senha</label>
                <input
                    id="senha"
                    name="senha"
                    type="password"
                    placeholder="Digite sua senha"
                    autocomplete="current-password"
                    class="mb-2 h-full min-h-[44px] w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-medium text-white placeholder:text-zinc-400 focus:outline-none"
                />

                <div class="flex justify-end mt-2">
                    <a href="#" class="text-sm text-white hover:text-gray-400">
                        Esqueceu sua senha?
                    </a>
                </div>
            </div>

            <!-- Divisor -->
            <div class="relative my-4 flex items-center">
              <div class="grow border-t border-zinc-800"></div>
              <span class="mx-4 text-xs text-zinc-400">OU</span>
              <div class="grow border-t border-zinc-800"></div>
            </div>

            <!-- Login Social -->
            <div class="flex flex-col sm:flex-row gap-4">
              
              <!-- Botão Google -->
                <button
                    type="button"
                    class="hover:cursor-pointer rounded-2xl flex items-center justify-center w-full sm:w-1/2 gap-2 border border-zinc-800 text-sm font-medium text-white py-3 hover:bg-zinc-800 transition-colors">
                
                    <span class="mr-2">
                        <svg
                        stroke="currentColor"
                        fill="currentColor"
                        stroke-width="0"
                        version="1.1"
                        x="0px"
                        y="0px"
                        viewBox="0 0 48 48"
                        enable-background="new 0 0 48 48"
                        class="h-5 w-5"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                        >

                            <path
                                fill="#FFC107"
                                d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
                                c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
                                c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z">
                            </path>

                            <path
                                fill="#FF3D00"
                                d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657
                                C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z">
                            </path>

                            <path
                                fill="#4CAF50"
                                d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
                                c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z">
                            </path>

                            <path
                                fill="#1976D2"
                                d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
                                c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z">
                            </path>
                        </svg>
                    </span>
                  <span>Google</span>
                </button>

              <!-- Botão Facebook -->
              <button
                type="button"
                class="hover:cursor-pointer rounded-2xl flex items-center justify-center w-full sm:w-1/2 gap-2 border border-zinc-800 text-sm font-medium text-white py-3 hover:bg-zinc-800 transition-colors"
              >
                <span class="mr-2">
                    <!-- SVG do Facebook -->
                    <svg
                      stroke="currentColor"
                      fill="#1877F2"
                      stroke-width="0"
                      viewBox="0 0 512 512"
                      class="h-5 w-5"
                      height="1em"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >

                        <path
                            d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.28c-30.8 0-40.41 19.12-40.41 38.73V256h68.78l-11 71.69h-57.78V501C413.31 482.38 504 379.78 504 256z">
                        </path>
                    </svg>
                </span>
                <span>Facebook</span>

              </button>
            </div>

            <!-- Botão principal -->
            <button
              type="submit"
              class="hover:cursor-pointer mt-6 w-full rounded-2xl bg-white text-zinc-950 py-4 font-medium hover:bg-white/90 active:bg-white/80 transition-all"
            >
              Entrar
            </button>

          </div>
        </form>

        <!-- Links -->
        <div class="flex flex-col gap-1 text-sm text-center">
          <a href="/dashboard/signin/signup" class="text-white hover:underline">
            Não tem uma conta?
          </a>
        </div>

      </div>
    </div>
  </div>

`