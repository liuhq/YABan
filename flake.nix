{
  description = "YABan";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs =
    {
      self,
      ...
    }@inputs:
    let
      systems = [
        "x86_64-linux"
      ];
      forEachSystem =
        f:
        inputs.nixpkgs.lib.genAttrs systems (
          system:
          f {
            inherit system;
            pkgs = import inputs.nixpkgs {
              inherit system;
              overlays = [
                inputs.self.overlays.default
              ];
            };
          }
        );
    in
    {
      overlays.default = final: prev: { };

      devShells = forEachSystem (
        { pkgs, system }:
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs_26
              pnpm_11

              valkey

              oxlint
              tsgolint
              oxfmt

              typescript-language-server
              tailwindcss-language-server
              vscode-langservers-extracted

              self.formatter.${system}
            ];
          };
        }
      );
      formatter = forEachSystem ({ pkgs, ... }: pkgs.nixfmt);
    };
}
